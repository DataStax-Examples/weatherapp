// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
const { createClient } = require("@astrajs/collections");

export default async function handler(req, res) {
    const astraClient = await createClient({
        astraDatabaseId: process.env.ASTRA_DB_ID,
        astraDatabaseRegion: process.env.ASTRA_DB_REGION,
        applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN,
    });

    const citiesCollection = astraClient
        .namespace("weather")
        .collection("observations");

    const { body } = req;
    const docKey = body.city + '_' + getWeekOfYear(body.date)

    const serverRes = await citiesCollection.get(docKey + '?fields=["forecast.*.date","forecast.*.stats.day.maxtemp_f","forecast.*.stats.day.mintemp_f"]')

    res.status(200).json(serverRes)
}

function getWeekOfYear(dt: string) {
    const dtObj = new Date(dt);
    const startDate = new Date(new Date().getFullYear(), 0, 1);
    var days = Math.floor((dtObj - startDate) /
        (24 * 60 * 60 * 1000));

    return Math.ceil(days / 7);
}
