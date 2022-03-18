import { MongoClient, ObjectId } from "mongodb"

const mongoTransaction = async () => {
  const mongoClient = new MongoClient("mongodb://localhost:27017/benchmark")
  await mongoClient.connect()
  const collectionName = "benchmark"

  // delete all
  try {
    await mongoClient.db().dropCollection(collectionName)
  } catch(err) {
    console.warn(err)
  }
  
  // create collection
  await mongoClient.db().createCollection(collectionName)

  const collection = mongoClient.db().collection("benchmark")

  // feed
  const feed = []
  for (let i = 0; i < 10000; i++) {
    feed.push({
      _id: i + "",
      email: i,
      stock: 0,
    })
  }
  await collection.insertMany(feed)

  let retry = 0;

  // insert
  const ins = await collection.insertOne({
    email: "abc@gmail.com"
  })
  console.log("ins", ins.insertedId)

  console.time("dbsave")

  await Promise.all(
    [1,2,3,4,5].map((p) => {
      return new Promise<void>(async (rs, rj) => {
        for(let i = 0 ;i < 5000; i++) {
          const session = mongoClient.startSession()
          await session.withTransaction(async () => {
            let sid = Math.floor(Math.random() * 10) + ""
            retry++;
            // count
            // const count = await collection.countDocuments()
            // console.log(count)
         
            // find all
            const get = await collection.find({
              _id: sid
            }, {session}).toArray()
            // console.log("get", get.map(r => console.log(r)))
        
            // update
            const upd = await collection.updateOne({
              _id: sid
            }, {
              $inc: { stock: 1 },
            }, {
              session,
            })
            // console.log("upd", upd.modifiedCount)
  
            // get
            const gg = await collection.find({
              _id: sid 
            }, {session}).toArray()
            // console.log("gg", gg.map(r => console.log(r)))
            
            // // delete
            // const del = await collection.deleteOne({
            //   _id: ins.insertedId
            // }, {session})
            // console.log("del", del.deletedCount)
          }, {
            readConcern: { level: "majority" },
            writeConcern: { w: "majority" },
          })
        }
        rs()
      })
    })
  )

  console.timeEnd("dbsave")
  console.log("total retry", retry)
  console.log("rows", await collection.find({}).limit(10).toArray())
  process.exit(0)
}

mongoTransaction().then(a => a).catch(err => console.error(err))