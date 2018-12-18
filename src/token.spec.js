import token from './token'

describe('Token', () => {
  it('should create a token', () => {
    expect(token.create({
      uid: 1
    })).to.be.equal('eyJ1aWQiOjF9.rVG2csaHGm1yp6B7GQj1Y2xE0ylWEmPzIZnckIAfgc0=')
  })

  it('should verify a token', () => {
    expect(token.verify(
      'eyJ1aWQiOjF9.rVG2csaHGm1yp6B7GQj1Y2xE0ylWEmPzIZnckIAfgc0='
    )).to.be.deep.equal({
      uid: 1
    })
  })
})
