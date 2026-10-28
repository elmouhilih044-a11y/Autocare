const { TicketCodeGenerator } = require('../../../src/modules/reservations/services/ticket-code-generator')
describe('TicketCodeGenerator', () => {
  const generator = new TicketCodeGenerator()
  it('génère un UUID', () => {
    expect(generator.generate()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
  it('génère des codes uniques', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generator.generate()))
    expect(codes.size).toBe(1000)
  })
})