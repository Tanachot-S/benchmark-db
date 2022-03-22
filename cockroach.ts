import { Pool } from "pg"

const cockroachTransaction = async () => {
  const pool = new Pool({
    host: "localhost",
    port: 26257,
    database: "cockroach",
    user: "root",
  })
  await pool.connect()

  // drop table
  const tableName = "benchmark"
  try {
    await pool.query(`DROP TABLE ${tableName}`)
  } catch(err) {
    console.warn(err)
  }

  // create table
  await pool.query(`CREATE TABLE ${tableName} (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
	  email STRING UNIQUE NOT NULL,
    stock INT NOT NULL,
    CONSTRAINT "primary" PRIMARY KEY (id ASC)
  );`)

  // feed
  const idsForAction: string[] = []
  for(let i = 0; i < 10000; i++) {
    const insQ = `INSERT INTO ${tableName}(email, stock) VALUES($1, $2) RETURNING id`
    const idIns = await pool.query(insQ, [i + "", 0]) 
    if (i < 10) {
      idsForAction.push(idIns.rows[0].id)
    }
  }

  // insert
  const insQ = `INSERT INTO ${tableName}(email, stock) VALUES($1, $2) RETURNING id`
  const res = await pool.query(insQ, ['abc@gmail.com', 0])
  console.log("ins", res.rows[0])

  let retry = 0;

  console.time("dbsave")

  await Promise.all(
    [1,2,3,4,5].map((p) => {
      return new Promise<void>(async (rs, rj) => {
        const client = await pool.connect()
        for(let i = 0 ;i < 5000; i++) {
          try {
            // const dd = new Date()
            // console.log(dd)
            let sid = idsForAction[Math.floor(Math.random()*idsForAction.length)];
            await client.query("BEGIN")
            retry++;
        
            // find all
            const getQ = `SELECT * FROM ${tableName} WHERE id = $1 FOR UPDATE`
            const g = await client.query(getQ, [sid])
        
            // update
            const upQ = `UPDATE ${tableName} SET stock = $1 WHERE id = $2`
            const u = await client.query(upQ, [Number(g.rows[0].stock) + 1, sid])

            // get
            const getQ2 = `SELECT * FROM ${tableName} WHERE id = $1`
            const g2 = await client.query(getQ2, [sid])
            
            await client.query("COMMIT")
            // console.log(new Date().getTime() - dd.getTime() / 1000)
          } catch (e) {
            console.log("err", e)
            await client.query("ROLLBACK")
          }
        }
        rs()
        client.release()
      })
    })
  )

  console.timeEnd("dbsave")
  console.log("total retry", retry)
  process.exit(0)
}

cockroachTransaction().then(a => a).catch(err => console.error(err))