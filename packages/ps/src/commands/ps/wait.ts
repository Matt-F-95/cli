import {Command, flags} from '@heroku-cli/command'
import * as Heroku from '@heroku-cli/schema'
import {cli} from 'cli-ux'

async function delay(millis: number) {
  return new Promise(resolve => setTimeout(resolve, millis))
}

export default class Wait extends Command {
  static description = 'wait for a release to cycle in'
  static help = `
When a release is created, it may take a while for all dynos to be
running the new version. This is especially true for applications in
Heroku Private Spaces or using the Common Runtime preboot feature,
where dynos cycle in gradually when a new release is deployed. This
command allows you to wait until all dynos are on the latest release
version.
  `
  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
    type: flags.string({char: 't', description: 'wait for one specific dyno type'}),
    'wait-interval': flags.integer({char: 'w', description: 'how frequently to poll in seconds (to avoid rate limiting)'}),
    'with-run': flags.boolean({char: 'R', description: 'whether to wait for one-off run dynos'})
  }

  async run() {
    const {flags} = this.parse(Wait)

    if (flags['with-run'] && flags.type) {
      throw new Error('Cannot specify both --type and --with-run')
    }

    const releases = await this.heroku.request<any[]>(`/apps/${flags.app}/releases`, {
      partial: true,
      headers: {
        Range: 'version ..; max=1, order=desc'
      }
    })

    if (releases.body.length === 0) {
      throw new Error(`App ${flags.app} has no releases`)
    }

    const latestRelease = releases.body[0]

    let released = true
    let interval = flags['wait-interval']
    if (!interval || interval < 0) {
      interval = 10
    }

    let lolLint = true
    while (lolLint) {
      const dynos = (await this.heroku.get<any[]>(`/apps/${flags.app}/dynos`)).body
        .filter(dyno => dyno.type !== 'release')
        .filter(dyno => flags['with-run'] || dyno.type !== 'run')
        .filter(dyno => !flags.type || dyno.type === flags.type)

      const onLatest = dynos.filter((dyno: any) => {
        return dyno.state === 'up' && dyno.release.version >= latestRelease.version
      })
      if (onLatest.length === dynos.length) {
        if (!released) {
          cli.action.stop(`${onLatest.length} / ${dynos.length}, done`)
        }
        break
      }

      if (released) {
        released = false
        cli.action.start(`Waiting for every dyno to be running v${latestRelease.version}`)
      }

      //cli.action.status(`${onLatest.length} / ${dynos.length}`)

      await delay(interval * 1000)
    }
  }
}
