'use strict'
/* globals describe it beforeEach afterEach cli nock expect context */

let cmd = require('../../../commands/members/add')
let stubGet = require('../../stub/get')
let stubPut = require('../../stub/put')

describe('heroku members:add', () => {
  let apiUpdateMemberRole

  beforeEach(() => cli.mockConsole())
  afterEach(() => nock.cleanAll())

  context('without the feature flag team-invite-acceptance', () => {
    beforeEach(() => {
      stubGet.teamFeatures([])
    })

    context('and group is a team', () => {
      beforeEach(() => {
        stubGet.teamInfo('team')
      })

      it('does not warn the user when under the free team limit', () => {
        stubGet.variableSizeteamMembers(1)
        stubGet.variableSizeTeamInvites(0)
        apiUpdateMemberRole = stubPut.updateMemberRole('foo@foo.com', 'admin')

        return cmd.run({args: {email: 'foo@foo.com'}, flags: {role: 'admin', team: 'myorg'}})
          .then(() => expect('').to.eq(cli.stdout))
          .then(() => expect(`Adding foo@foo.com to myorg as admin... done
`).to.eq(cli.stderr))
          .then(() => apiUpdateMemberRole.done())
      })

      it('does not warn the user when over the free team limit', () => {
        stubGet.variableSizeteamMembers(7)
        stubGet.variableSizeTeamInvites(0)
        apiUpdateMemberRole = stubPut.updateMemberRole('foo@foo.com', 'admin')

        return cmd.run({args: {email: 'foo@foo.com'}, flags: {role: 'admin', team: 'myorg'}})
          .then(() => expect('').to.eq(cli.stdout))
          .then(() => expect(`Adding foo@foo.com to myorg as admin... done
`).to.eq(cli.stderr))
          .then(() => apiUpdateMemberRole.done())
      })

      it('does warn the user when at the free team limit', () => {
        stubGet.variableSizeteamMembers(6)
        stubGet.variableSizeTeamInvites(0)
        apiUpdateMemberRole = stubPut.updateMemberRole('foo@foo.com', 'admin')

        return cmd.run({args: {email: 'foo@foo.com'}, flags: {role: 'admin', team: 'myorg'}})
          .then(() => expect('').to.eq(cli.stdout))
          .then(() => expect(`Adding foo@foo.com to myorg as admin... done
 ▸    You'll be billed monthly for teams over 5 members.\n`).to.eq(cli.stderr))
          .then(() => apiUpdateMemberRole.done())
      })

      context('using --org instead of --team', () => {
        it('adds the member, but it shows a warning about the usage of -t instead', () => {
          stubGet.variableSizeteamMembers(1)
          stubGet.variableSizeTeamInvites(0)

          apiUpdateMemberRole = stubPut.updateMemberRole('foo@foo.com', 'admin')
          return cmd.run({org: 'myorg', args: {email: 'foo@foo.com'}, flags: {role: 'admin'}})
            .then(() => expect('').to.eq(cli.stdout))
            .then(() => expect(`Adding foo@foo.com to myorg as admin... done
 ▸    myorg is a Heroku Team\n ▸    Heroku CLI now supports Heroku Teams.\n ▸    Use -t or --team for teams like myorg\n`).to.eq(cli.stderr))
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
        apiUpdateMemberRole = stubPut.updateMemberRole('foo@foo.com', 'admin')

        return cmd.run({org: 'myorg', args: {email: 'foo@foo.com'}, flags: {role: 'admin'}})
          .then(() => expect('').to.eq(cli.stdout))
          .then(() => expect(`Adding foo@foo.com to myorg as admin... done
`).to.eq(cli.stderr))
          .then(() => apiUpdateMemberRole.done())
      })
    })
  })

  context('with the feature flag team-invite-acceptance for a team', () => {
    beforeEach(() => {
      stubGet.teamFeatures([{name: 'team-invite-acceptance', enabled: true}])
      stubGet.teamInfo('team')
    })

    it('does warn the user when free team limit is caused by invites', () => {
      let apiSendInvite = stubPut.sendInvite('foo@foo.com', 'admin')

      let apiGetteamMembers = stubGet.variableSizeteamMembers(1)
      let apiGetTeamInvites = stubGet.variableSizeTeamInvites(5)

      return cmd.run({args: {email: 'foo@foo.com'}, flags: {role: 'admin', team: 'myorg'}})
        .then(() => apiSendInvite.done())
        .then(() => apiGetteamMembers.done())
        .then(() => apiGetTeamInvites.done())
        .then(() => expect('').to.eq(cli.stdout))
        .then(() => expect(`Inviting foo@foo.com to myorg as admin... email sent
 ▸    You'll be billed monthly for teams over 5 members.\n`).to.eq(cli.stderr))
    })

    it('sends an invite when adding a new user to the team', () => {
      let apiSendInvite = stubPut.sendInvite('foo@foo.com', 'admin')

      stubGet.variableSizeteamMembers(1)
      stubGet.variableSizeTeamInvites(0)

      return cmd.run({args: {email: 'foo@foo.com'}, flags: {role: 'admin', team: 'myorg'}})
        .then(() => expect('').to.eq(cli.stdout))
        .then(() => expect(`Inviting foo@foo.com to myorg as admin... email sent\n`).to.eq(cli.stderr))
        .then(() => apiSendInvite.done())
    })
  })
})
