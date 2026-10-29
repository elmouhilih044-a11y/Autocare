const errorHandler = require('../../../src/shared/error-handler');
const { AppError } = require('../../../src/shared/errors');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  it('maps AppError to the API error envelope', () => {
    const res = mockRes();
    errorHandler(new AppError('FORBIDDEN', 403, 'Access denied'), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'FORBIDDEN',
      message: 'Access denied',
    });
  });

  it('maps duplicate key errors to 409', () => {
    const res = mockRes();
    errorHandler({ code: 11000 }, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].code).toBe('RESOURCE_CONFLICT');
  });
});
