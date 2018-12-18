import password from './password'

describe('Password', () => {
  it('should verify that a password is hashed properly', async () => {
    const hashedPassword = await password.hash('hola')
    expect(await password.verify('hola', hashedPassword)).to.be.true
  })
})
