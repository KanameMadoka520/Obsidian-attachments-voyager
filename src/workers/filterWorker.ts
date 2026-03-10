import { filterIssues, type FilterParams } from '../lib/filterUtils'

self.onmessage = (e: MessageEvent<FilterParams>) => {
  const result = filterIssues(e.data)
  self.postMessage({ requestId: e.data.requestId, issues: result })
}
