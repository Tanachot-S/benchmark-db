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
	  email VARCHAR ( 255 ) UNIQUE NOT NULL
  );`)
  // await fromPostgresClient.query(
  //   `SET search_path TO '${config.from.prisma.project}$${config.from.prisma.stage}'`,
  // )

  const client = await pool.connect()
  try {
    console.time("dbsave")
    await client.query("BEGIN")
    // count
    const countQ = `SELECT COUNT(*) FROM ${tableName}`
    const c = await client.query(countQ)
    console.log("get", c.rows[0])

    // insert
    const insQ = `INSERT INTO ${tableName}(email) VALUES($1) RETURNING id`
    const res = await client.query(insQ, ['abc@gmail.com'])
    console.log("ins", res.rows[0])

    // update
    const upQ = `UPDATE ${tableName} SET email = $1`
    const u = await client.query(upQ, ['def@gmail.com'])
    console.log("up", u.rows[0])

    // get
    const getQ = `SELECT * FROM ${tableName}`
    const g = await client.query(getQ)
    console.log("get", g.rows[0])

    // delete
    const delQ = `DELETE FROM ${tableName} WHERE 1=1`
    const d = await client.query(delQ)
    console.log("del",d.rows)
   
    await client.query("COMMIT")
  } catch (e) {
    await client.query("ROLLBACK")
    throw e
  } finally {
    client.release()
    console.timeEnd("dbsave")
  }

  process.exit(0)
}

postgresTransaction().then(a => a).catch(err => console.error(err))