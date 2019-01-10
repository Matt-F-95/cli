'use strict'
/* globals describe it beforeEach afterEach cli nock expect context */

let cmd = require('../../../commands/members/set')
let stubGet = require('../../stub/get')
let stubPatch = require('../../stub/patch')

describe('heroku members:set', () => {
  let apiUpdateMemberRole

  beforeEach(() => {
    cli.mockConsole()
    stubGet.teamFeatures([])
  })
  afterEach(() => nock.cleanAll())

  context('and group is a team', () => {
    beforeEach(() => {
      stubGet.teamInfo('team')
    })

    it('does not warn the user when under the free team limit', () => {
      stubGet.variableSizeteamMembers(1)
      stubGet.variableSizeTeamInvites(0)
      apiUpdateMemberRole = stubPatch.updateMemberRole('foo@foo.com', 'admin')

      return cmd.run({args: {email: 'foo@foo.com'}, flags: {role: 'admin', team: 'myteam'}})
        .then(() => expect('').to.eq(cli.stdout))
        .then(() => expect(`Adding foo@foo.com to myteam as admin... done
`).to.eq(cli.stderr))
        .then(() => apiUpdateMemberRole.done())
    })

    it('does not warn the user when over the free team limit', () => {
      stubGet.variableSizeteamMembers(7)
      stubGet.variableSizeTeamInvites(0)
      apiUpdateMemberRole = stubPatch.updateMemberRole('foo@foo.com', 'admin')

      return cmd.run({args: {email: 'foo@foo.com'}, flags: {role: 'admin', team: 'myteam'}})
        .then(() => expect('').to.eq(cli.stdout))
        .then(() => expect(`Adding foo@foo.com to myteam as admin... done
`).to.eq(cli.stderr))
        .then(() => apiUpdateMemberRole.done())
    })

    it('does warn the user when at the free team limit', () => {
      stubGet.variableSizeteamMembers(6)
      stubGet.variableSizeTeamInvites(0)
      apiUpdateMemberRole = stubPatch.updateMemberRole('foo@foo.com', 'admin')

      return cmd.run({args: {email: 'foo@foo.com'}, flags: {role: 'admin', team: 'myteam'}})
        .then(() => expect('').to.eq(cli.stdout))
        .then(() => expect(`Adding foo@foo.com to myteam as admin... done
 ▸    You'll be billed monthly for teams over 5 members.\n`).to.eq(cli.stderr))
        .then(() => apiUpdateMemberRole.done())
    })

    context('using --org instead of --team', () => {
      it('adds the member, but it shows a warning about the usage of -t instead', () => {
        stubGet.variableSizeteamMembers(1)
        stubGet.variableSizeTeamInvites(0)

        apiUpdateMemberRole = stubPatch.updateMemberRole('foo@foo.com', 'admin')
        return cmd.run({org: 'myteam', args: {email: 'foo@foo.com'}, flags: {role: 'admin'}})
          .then(() => expect('').to.eq(cli.stdout))
          .then(() => expect(`Adding foo@foo.com to myteam as admin... done
 ▸    myteam is a Heroku Team\n ▸    Heroku CLI now supports Heroku Teams.\n ▸    Use -t or --team for teams like myteam\n`).to.eq(cli.stderr))
          .then(() => apiUpdateMemberRole.done())
      })
    })
  })

  context('and group is an enterprise team', () => {
    beforeEach(() => {
      stubGet.teamInfo('enterprise')
      stubGet.variableSizeteamMembers(1)
    })

    it('adds a member to a team', () => {
      apiUpdateMemberRole = stubPatch.updateMemberRole('foo@foo.com', 'admin')

      return cmd.run({org: 'myteam', args: {email: 'foo@foo.com'}, flags: {role: 'admin'}})
        .then(() => expect('').to.eq(cli.stdout))
        .then(() => expect(`Adding foo@foo.com to myteam as admin... done
`).to.eq(cli.stderr))
        .then(() => apiUpdateMemberRole.done())
    })
  })
})
