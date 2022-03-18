import { Pool } from "pg"

const postgresTransaction = async () => {
  const pool = new Pool({
    host: "localhost",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: "postgres"
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
    id serial PRIMARY KEY,
	  email VARCHAR ( 255 ) UNIQUE NOT NULL,
    stock INT NOT NULL
  );`)

  // feed
  for(let i = 0; i < 10000; i++) {
    const insQ = `INSERT INTO ${tableName}(email, stock) VALUES($1, $2) RETURNING id`
    await pool.query(insQ, [i + "", 0]) 
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
            let sid = 1 + Math.floor(Math.random() * 10)
            await client.query("BEGIN")
            retry++;
            // count
            // const countQ = `SELECT COUNT(*) FROM ${tableName}`
            // const c = await client.query(countQ)
            // console.log("get", c.rows[0])
        
            // find all
            const getQ = `SELECT * FROM ${tableName} WHERE id = $1 FOR UPDATE`
            const g = await client.query(getQ, [sid])
            // console.log("get lock...", g.rows[0])
        
            // update
            const upQ = `UPDATE ${tableName} SET stock = $1 WHERE id = $2`
            const u = await client.query(upQ, [g.rows[0].stock + 1, sid])
            // console.log("up", u.rows[0])

            // get
            const getQ2 = `SELECT * FROM ${tableName} WHERE id = $1`
            const g2 = await client.query(getQ2, [sid])
            // console.log("gg", g2.rows[0])
            
            // // delete
            // const delQ = `DELETE FROM ${tableName} WHERE 1=1`
            // const d = await client.query(delQ)
            // console.log("del", d.rows)
          
            await client.query("COMMIT")
           
          } catch (e) {
            console.log("err", e)
            await client.query("ROLLBACK")
            // rj()
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

postgresTransaction().then(a => a).catch(err => console.error(err))