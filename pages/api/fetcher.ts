// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
const { createClient } = require("@astrajs/collections");

// this URL expects : 
// city, forecastDate (yyyy-mm-dd format), numDays (range for which forecast need to be fetched)
// and pulls the weather forecast data from weatherapi.com
// and saves it to `forecast` collection with docID as <cityName_weekNum>
// weekNum derived from forecastDate
// the processing is async 
export default async function handler(req, res) {
    const astraClient = await createClient({
        astraDatabaseId: process.env.ASTRA_DB_ID,
        astraDatabaseRegion: process.env.ASTRA_DB_REGION,
        applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN,
    });

    const citiesCollection = astraClient
        .namespace("weather")
        .collection("observations");

    const weatherApiKey = process.env.WEATHER_API_KEY;

    if (req.method === "POST") {
        const { body } = req;
        const startDt = body.forecastDate
        const details = new Map()
        const reqs = []

        // concurrent parallel forecast / historical data fetch
        for (let i = -body.numDays; i <= body.numDays; i++) {
            const dt = new Date(startDt)
            dt.setDate(dt.getDate() + i)
            body.forecastDate = dt.toISOString().split('T')[0]

            const week = getWeekOfYear(body.forecastDate)
            const docKey = body.city + '_' + week
            if (await citiesCollection.get(`${docKey}?where={"forecast.*.date":{"$eq": "${body.forecastDate}" }}`) == null) { // fetch only if the corresponding city-date observation isnt already stored 
                const forecastRes = await fetchWeatherForecast(body.city, dt, body.forecastDate, weatherApiKey)
                reqs.push(forecastRes)
            }
        }

        // wait for all the requests to complete
        const forecastResponses = await Promise.all(reqs)

        // write to C* via Docs API
        forecastResponses.forEach(async r => {
            if (!r.ok) {
                console.log('Error during weatherapi fetch ' + r.statusText)
            } else {
                const fcBody = await r.json()
                const reqDt = fcBody['forecast']['forecastday'][0]['date']
                const week = getWeekOfYear(reqDt)
                const docKey = body.city + '_' + week
                details.set(reqDt, week)

                // check if city_weekNum docID already exists 
                // if so, proceed with a patch operation 
                // else add a new doc with docID as city_weekNum
                if (await checkIfDocExists(docKey, citiesCollection)) {
                    console.log(`${docKey}?where={"forecast.*.date":{"$eq": "${reqDt}" }}`)
                    if (await citiesCollection.get(`${docKey}?where={"forecast.*.date":{"$eq": "${reqDt}" }}`) == null) {
                        await citiesCollection.push(docKey + '/forecast', { day: reqDt, date: reqDt, stats: fcBody['forecast']['forecastday'][0] })
                    }
                } else {
                    await citiesCollection.create(docKey, { city: body.city, week: week, location: fcBody['location'], forecast: [{ day: reqDt, date: reqDt, stats: fcBody['forecast']['forecastday'][0] }] })
                }
            }
        })

        res.status(200).json({ city: body.city, details: details })
    }
}

async function fetchWeatherForecast(city, jsDate, date, weatherApiKey) {
    let url = "";

    if (jsDate.getTime() < new Date().getTime() - (2 * 24 * 60 * 60 * 1000)) { // fallback to using historical api if inputDate older than 2 days from current date
        url = 'https://api.weatherapi.com/v1/history.json?key=' + weatherApiKey + '&q=' + city + '&dt=' + date;
    } else {
        url = 'https://api.weatherapi.com/v1/forecast.json?key=' + weatherApiKey + '&q=' + city + '&dt=' + date;
    }

    console.log(url)
    const forecastRes = fetch(url)
    return forecastRes
}

async function checkIfDocExists(docKey: string, citiesCollection) {
    const docExists = await citiesCollection.get(docKey)
    return docExists == null ? false : true
}

function getWeekOfYear(dt: string) {
    const dtObj = new Date(dt);
    const startDate = new Date(new Date().getFullYear(), 0, 1);
    var days = Math.floor((dtObj - startDate) /
        (24 * 60 * 60 * 1000));

    return Math.ceil(days / 7);
}