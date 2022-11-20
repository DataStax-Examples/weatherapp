// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
const { createClient } = require("@astrajs/collections");

// type Data = {
//     name: string
// }

export default async function handler(req, res) {
    console.log("###" + process.env.ASTRA_DB_ID);
    const astraClient = await createClient({
        astraDatabaseId: process.env.ASTRA_DB_ID,
        astraDatabaseRegion: process.env.ASTRA_DB_REGION,
        applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN,
    });

    const citiesCollection = astraClient
        .namespace("weather")
        .collection("cities");


    console.log(citiesCollection);

    if (req.method === "POST") {
        const { body } = req;
        const city = {
            name: body.name,
        };

        const newMember = await citiesCollection.create(city);
        res.status(201).json({ id: newMember.documentId, ...city });

        return;
    }

    let cities = [];
    if (req.query.keyword) {
        cities = await citiesCollection.find({
            name: { $eq: req.query.keyword },
        });
    } else {
        cities = await citiesCollection.find({});
    }

    res
        .status(200)
        .json(Object.keys(cities).map((key) => ({ id: key, ...cities[key] })));
}
