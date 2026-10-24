import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyFetchError,
  classifyHttpResult,
  getBotBlockedReason,
  mergePolicies
} from '../source-validation-policy'

const policy = mergePolicies({
  botBlockedDomains: new Set(['uxpatterns.dev']),
  botBlockedUrls: new Set(['https://example.com/blocked'])
})

test('classifies approved bot-blocked domains as valid', () => {
  const result = classifyHttpResult({
    url: 'https://uxpatterns.dev/patterns/navigation/tabs',
    status: 429,
    redirected: false,
    policy
  })

  assert.equal(result.classification, 'bot_blocked')
  assert.equal(result.ok, true)
  assert.match(result.note ?? '', /allowed via domain/)
})

test('classifies approved exact URLs as valid bot-blocked resources', () => {
  const result = classifyHttpResult({
    url: 'https://example.com/blocked',
    status: 403,
    redirected: false,
    policy
  })

  assert.equal(result.classification, 'bot_blocked')
  assert.equal(result.ok, true)
  assert.match(result.note ?? '', /allowed via exact URL/)
})

test('treats unapproved blocking responses as dead', () => {
  const result = classifyHttpResult({
    url: 'https://example.com/not-allowed',
    status: 429,
    redirected: false,
    policy
  })

  assert.equal(result.classification, 'dead')
  assert.equal(result.ok, false)
})

test('marks redirected responses separately from ok responses', () => {
  const result = classifyHttpResult({
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
    status: 200,
    redirected: true,
    policy
  })

  assert.equal(result.classification, 'redirect')
  assert.equal(result.ok, true)
})

test('classifies fetch failures by timeout vs generic error', () => {
  const timeoutError = new Error('request timed out')
  timeoutError.name = 'AbortError'

  assert.equal(classifyFetchError(timeoutError).classification, 'timeout')
  assert.equal(classifyFetchError(new Error('socket hang up')).classification, 'error')
})

test('matches approved domains and exact urls when explaining bot-blocked allowances', () => {
  assert.match(
    getBotBlockedReason('https://uxpatterns.dev/patterns/forms/button', policy) ?? '',
    /uxpatterns\.dev/
  )
  assert.equal(getBotBlockedReason('https://unknown.example.com', policy), null)
})
