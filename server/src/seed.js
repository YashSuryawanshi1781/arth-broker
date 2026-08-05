import { initDb } from './db.js'
import { market } from './market.js'
import { ensureDemoUser } from './seedDemo.js'

initDb()

ensureDemoUser()
  .then(() => {
    console.log('  instruments online:', market.list().length)
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
