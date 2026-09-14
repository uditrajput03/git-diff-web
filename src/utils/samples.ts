export interface DiffSample {
  id: string;
  name: string;
  category: string;
  description: string;
  language: string;
  originalFilename: string;
  modifiedFilename: string;
  original: string;
  modified: string;
}

export const DIFF_SAMPLES: DiffSample[] = [
  {
    id: 'typescript-refactor',
    name: 'TypeScript Refactor',
    category: 'Code',
    description: 'Refactoring checkout cart calculator with TypeScript types and discount tiers',
    language: 'typescript',
    originalFilename: 'cart-service.ts (Before)',
    modifiedFilename: 'cart-service.ts (After)',
    original: `interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// Calculates the subtotal for all items
export function calculateSubtotal(items: CartItem[]): number {
  let subtotal = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    subtotal += item.price * item.quantity;
  }
  return subtotal;
}

export function applyDiscount(subtotal: number, couponCode?: string): number {
  if (couponCode === 'SAVE10') {
    return subtotal * 0.9;
  }
  if (couponCode === 'SAVE20') {
    return subtotal * 0.8;
  }
  return subtotal;
}

export function formatPrice(amount: number): string {
  return '$' + amount.toFixed(2);
}
`,
    modified: `interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  taxExempt?: boolean;
}

export interface CartCalculationResult {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: 'USD';
}

const COUPON_DISCOUNTS: Record<string, number> = {
  SAVE10: 0.10,
  SAVE20: 0.20,
  SUMMER30: 0.30,
};

// Calculates subtotal using functional reduce
export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.price * Math.max(1, item.quantity), 0);
}

export function applyDiscount(subtotal: number, couponCode?: string): { finalAmount: number; discountAmount: number } {
  const discountRate = couponCode ? (COUPON_DISCOUNTS[couponCode.toUpperCase()] ?? 0) : 0;
  const discountAmount = Number((subtotal * discountRate).toFixed(2));
  return {
    finalAmount: subtotal - discountAmount,
    discountAmount,
  };
}

export function formatPrice(amount: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(amount);
}
`,
  },
  {
    id: 'json-config',
    name: 'JSON API Config',
    category: 'Config',
    description: 'Upgrading cloud service endpoints, rate limits, and feature toggles in JSON',
    language: 'json',
    originalFilename: 'app-config.v1.json',
    modifiedFilename: 'app-config.v2.json',
    original: `{
  "appVersion": "1.4.0",
  "environment": "production",
  "server": {
    "host": "api.legacy-internal.net",
    "port": 8080,
    "ssl": false,
    "timeoutMs": 5000
  },
  "features": {
    "betaDashboard": false,
    "analyticsV2": false,
    "ssoAuth": false
  },
  "rateLimit": {
    "maxRequests": 100,
    "windowSeconds": 60
  }
}
`,
    modified: `{
  "appVersion": "2.0.0",
  "environment": "production",
  "server": {
    "host": "api.cloud-gateway.io",
    "port": 443,
    "ssl": true,
    "timeoutMs": 3000,
    "retryPolicy": {
      "maxRetries": 3,
      "backoffMs": 250
    }
  },
  "features": {
    "betaDashboard": true,
    "analyticsV2": true,
    "ssoAuth": true,
    "aiAssistant": true
  },
  "rateLimit": {
    "maxRequests": 500,
    "windowSeconds": 60
  }
}
`,
  },
  {
    id: 'python-service',
    name: 'Python Cache Refactor',
    category: 'Code',
    description: 'Adding LRU caching, type hints, and exception logging in Python',
    language: 'python',
    originalFilename: 'user_repository.py (Old)',
    modifiedFilename: 'user_repository.py (New)',
    original: `import json
import requests

class UserRepository:
    def __init__(self, base_url):
        self.base_url = base_url

    def get_user_by_id(self, user_id):
        url = self.base_url + "/users/" + str(user_id)
        resp = requests.get(url)
        if resp.status_code == 200:
            return resp.json()
        return None

    def update_user_status(self, user_id, active):
        url = self.base_url + "/users/" + str(user_id)
        payload = {"is_active": active}
        resp = requests.patch(url, json=payload)
        return resp.status_code == 200
`,
    modified: `import logging
from functools import lru_cache
from typing import Optional, Dict, Any
import requests

logger = logging.getLogger(__name__)

class UserRepository:
    def __init__(self, base_url: str, request_timeout: int = 5):
        self.base_url = base_url.rstrip("/")
        self.timeout = request_timeout

    @lru_cache(maxsize=1024)
    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/api/v2/users/{user_id}"
        try:
            resp = requests.get(url, timeout=self.timeout)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as err:
            logger.error("Failed to fetch user %s: %s", user_id, err)
            return None

    def update_user_status(self, user_id: int, active: bool) -> bool:
        url = f"{self.base_url}/api/v2/users/{user_id}"
        payload = {"is_active": active}
        try:
            resp = requests.patch(url, json=payload, timeout=self.timeout)
            # Invalidate cache entry after mutation
            self.get_user_by_id.cache_clear()
            return resp.ok
        except requests.RequestException as err:
            logger.error("Failed to update status for user %s: %s", user_id, err)
            return False
`,
  },
  {
    id: 'markdown-docs',
    name: 'Markdown Documentation',
    category: 'Docs',
    description: 'Documentation change updating API setup instructions and prerequisites',
    language: 'markdown',
    originalFilename: 'README.md (v1.0)',
    modifiedFilename: 'README.md (v2.0)',
    original: `# My Project

Quick installation guide for local environment:

## Prerequisites
- Node.js 16.x or higher
- Yarn package manager

## Getting Started
\`\`\`bash
git clone https://github.com/example/repo.git
cd repo
yarn install
yarn start
\`\`\`

Contact support at help@example.com for issues.
`,
    modified: `# My Modern Platform 🚀

Enterprise-ready cloud developer workspace and analytics dashboard.

## Prerequisites
- Node.js 20 LTS or Node.js 22 LTS
- pnpm 9.x (recommended) or npm 10+
- Docker Desktop 4.25+ (for local microservices)

## Getting Started
\`\`\`bash
# Clone the repository
git clone https://github.com/example/repo.git
cd repo

# Install dependencies and start development server
pnpm install
pnpm dev
\`\`\`

## Community & Support
- Join our [Discord Server](https://discord.gg/example)
- Report bugs via [GitHub Issues](https://github.com/example/repo/issues)
`,
  },
];
