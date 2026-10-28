const { randomUUID } = require('node:crypto')
class TicketCodeGenerator {
  generate() {
    return randomUUID()
  }
}
module.exports = { TicketCodeGenerator }