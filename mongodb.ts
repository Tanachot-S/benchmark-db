import { MongoClient } from "mongodb"

const mongoTransaction = async () => {
  const mongoClient = new MongoClient("mongodb://localhost:27017/benchmark")
  await mongoClient.connect()
  console.log(">>>>>>>>>S")
  const collectionName = "benchmark"

  // delete all
  await mongoClient.db().dropCollection(collectionName)

  // create collection
  await mongoClient.db().createCollection(collectionName)

  const collection = mongoClient.db().collection("benchmark")
  console.log(">>>>>>>>>>>>>>>")
  console.time("dbsave")

  const session = mongoClient.startSession()
  await session.withTransaction(async () => {
    // get
    const count = collection.countDocuments()
    console.log(count)

    // insert
    const ins = await collection.insertOne({
      email: "abc@gmail.com"
    }, {session})
    console.log("ins", ins.insertedId)

    // update
    const upd = await collection.updateOne({
      _id: ins.insertedId
    }, {
      $set: { email: "def@gmail.com" },
    }, {
      session,
    })
    console.log("upd", upd.upsertedCount)

    // get 
    const get = await collection.find({}, {session}).toArray()
    console.log("get", get.map(r => console.log(r)))
    
    // delete
    const del = await collection.deleteOne({
      _id: ins.insertedId
    }, {session})
    console.log("del", del.deletedCount)
  }, {
    // readPreference: {
    //   preference: ReadPreferenceMode.primary,
    // },
    readConcern: { level: "majority" },
    writeConcern: { w: "majority" },
  })

  console.timeEnd("dbsave")
  process.exit(0)
}

mongoTransaction().then(a => a).catch(err => console.error(err))