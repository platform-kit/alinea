import {schema, store} from '.alinea'
import {PasswordLessAuth} from '@alinea/auth.passwordless/PasswordLessAuth.js'
import {Hub} from '@alinea/core'
import {Backend, GitDrafts, Server} from '@alinea/server'
import dotenv from 'dotenv'
import http from 'isomorphic-git/http/node/index.js'
import {fs as memFs} from 'memfs'
import {createTransport} from 'nodemailer'

dotenv.config({path: '../../.env'})

/*const cacheDir = isProduction ? 'packages/website/' : ''
const index = Cache.fromFile({
  schema,
  dir: 'content',
  cacheFile: `${cacheDir}.next/server/chunks/content`
})*/
/*
const index = Cache.fromPromise(schema, store)
const persistence = isProduction
  ? new GithubPersistence({
      index,
      contentDir: 'packages/website/content',
      githubAuthToken: process.env.GITHUB_TOKEN!,
      owner: 'codeurs',
      repo: 'alinea',
      branch: 'main'
    })
  : new FSPersistence(fs, index, 'content')*/

const isProduction = process.env.NODE_ENV === 'production'
const dashboardUrl = isProduction
  ? 'https://alinea.vercel.app/admin'
  : 'http://localhost:3000/admin'
const onAuth = () => ({username: process.env.GITHUB_TOKEN})
const drafts = new GitDrafts({
  fs: memFs.promises as any,
  dir: '/tmp',
  http,
  onAuth,
  url: 'https://github.com/benmerckx/content',
  ref: 'drafts',
  author: {
    name: 'Ben',
    email: 'ben@codeurs.be'
  }
})
const hub: Hub = {
  schema,
  content: new Backend(await store, undefined!),
  drafts //
}
const auth = new PasswordLessAuth({
  dashboardUrl,
  subject: 'Login',
  from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
  transporter: createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD
    }
  }),
  jwtSecret: process.env.JWT_SECRET!,
  async isUser(email: string) {
    return email.endsWith('@codeurs.be')
  }
})
const server = new Server({
  auth,
  dashboardUrl,
  hub
})

export default server.respond
