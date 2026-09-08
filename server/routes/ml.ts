import { Router, Response, Request } from 'express'
import http from 'http'

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000'

const router = Router()

function parseUrl(url: string): { hostname: string; port: number; path: string } {
  const u = new URL(url)
  return {
    hostname: u.hostname,
    port: parseInt(u.port) || (u.protocol === 'https:' ? 443 : 80),
    path: u.pathname + u.search
  }
}

function proxyRequest(req: Request, res: Response, endpoint: string) {
  const url = `${ML_API_URL}${endpoint}`
  const { hostname, port, path } = parseUrl(url)

  const options: http.RequestOptions = {
    hostname,
    port,
    path,
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      ...(req.method !== 'GET' && req.method !== 'HEAD' ? { 'Content-Length': Buffer.byteLength(JSON.stringify(req.body)) } : {})
    }
  }

  const proxyReq = http.request(options, (proxyRes) => {
    let data = ''
    proxyRes.on('data', (chunk) => { data += chunk })
    proxyRes.on('end', () => {
      try {
        const jsonData = data ? JSON.parse(data) : {}
        res.status(proxyRes.statusCode || 500).json(jsonData)
      } catch {
        res.status(500).json({ success: false, error: { code: 'ML_PARSE_ERROR', message: 'Failed to parse ML service response' } })
      }
    })
  })

  proxyReq.on('error', (err) => {
    console.error('ML proxy error:', err)
    res.status(503).json({ success: false, error: { code: 'ML_SERVICE_UNAVAILABLE', message: err.message } })
  })

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    proxyReq.write(JSON.stringify(req.body))
  }
  proxyReq.end()
}

// ML Health check
router.get('/health', async (req, res) => {
  proxyRequest(req, res, '/health')
})

// ML Train
router.post('/train', async (req, res) => {
  proxyRequest(req, res, '/train')
})

// ML Predict
router.post('/predict', async (req, res) => {
  proxyRequest(req, res, '/predict')
})

// ML Full Analysis (returns File A + File B)
router.post('/analyze', async (req, res) => {
  proxyRequest(req, res, '/analyze')
})

// ML CSV Analysis
router.post('/analyze-csv', async (req, res) => {
  proxyRequest(req, res, '/analyze-csv')
})

// ML Models info
router.get('/models', async (req, res) => {
  proxyRequest(req, res, '/models')
})

// ML Playbooks
router.get('/playbooks', async (req, res) => {
  proxyRequest(req, res, '/playbooks')
})

router.get('/playbooks/:id', async (req, res) => {
  proxyRequest(req, res, `/playbooks/${req.params.id}`)
})

export default router