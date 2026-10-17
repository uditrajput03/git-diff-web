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
    id: 'plaintext-intro',
    name: 'Plain Text Quickstart',
    category: 'Text',
    description: 'A minimal single-line text comparison demonstrating live diffing',
    language: 'plaintext',
    originalFilename: 'original.txt',
    modifiedFilename: 'modified.txt',
    original: 'Welcome to Git Diff Web: paste or type original text here to compare changes.',
    modified: 'Welcome to Git Diff Web: paste or edit modified text here to visualize differences.',
  },
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
    original: `{\n  "appVersion": "1.4.0",\n  "environment": "production",\n  "server": {\n    "host": "api.legacy-internal.net",\n    "port": 8080,\n    "ssl": false,\n    "timeoutMs": 5000\n  },\n  "features": {\n    "betaDashboard": false,\n    "analyticsV2": false,\n    "ssoAuth": false\n  },\n  "rateLimit": {\n    "maxRequests": 100,\n    "windowSeconds": 60\n  }\n}\n`,
    modified: `{\n  "appVersion": "2.0.0",\n  "environment": "production",\n  "server": {\n    "host": "api.cloud-gateway.io",\n    "port": 443,\n    "ssl": true,\n    "timeoutMs": 3000,\n    "retryPolicy": {\n      "maxRetries": 3,\n      "backoffMs": 250\n    }\n  },\n  "features": {\n    "betaDashboard": true,\n    "analyticsV2": true,\n    "ssoAuth": true,\n    "aiAssistant": true\n  },\n  "rateLimit": {\n    "maxRequests": 500,\n    "windowSeconds": 60\n  }\n}\n`,
  },
  {
    id: 'python-service',
    name: 'Python Cache Refactor',
    category: 'Code',
    description: 'Adding LRU caching, type hints, and exception logging in Python',
    language: 'python',
    originalFilename: 'user_repository.py (Old)',
    modifiedFilename: 'user_repository.py (New)',
    original: `import json\nimport requests\n\nclass UserRepository:\n    def __init__(self, base_url):\n        self.base_url = base_url\n\n    def get_user_by_id(self, user_id):\n        url = self.base_url + "/users/" + str(user_id)\n        resp = requests.get(url)\n        if resp.status_code == 200:\n            return resp.json()\n        return None\n\n    def update_user_status(self, user_id, active):\n        url = self.base_url + "/users/" + str(user_id)\n        payload = {"is_active": active}\n        resp = requests.patch(url, json=payload)\n        return resp.status_code == 200\n`,
    modified: `import logging\nfrom functools import lru_cache\nfrom typing import Optional, Dict, Any\nimport requests\n\nlogger = logging.getLogger(__name__)\n\nclass UserRepository:\n    def __init__(self, base_url: str, request_timeout: int = 5):\n        self.base_url = base_url.rstrip("/")\n        self.timeout = request_timeout\n\n    @lru_cache(maxsize=1024)\n    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:\n        url = f"{self.base_url}/api/v2/users/{user_id}"\n        try:\n            resp = requests.get(url, timeout=self.timeout)\n            resp.raise_for_status()\n            return resp.json()\n        except requests.RequestException as err:\n            logger.error("Failed to fetch user %s: %s", user_id, err)\n            return None\n\n    def update_user_status(self, user_id: int, active: bool) -> bool:\n        url = f"{self.base_url}/api/v2/users/{user_id}"\n        payload = {"is_active": active}\n        try:\n            resp = requests.patch(url, json=payload, timeout=self.timeout)\n            # Invalidate cache entry after mutation\n            self.get_user_by_id.cache_clear()\n            return resp.ok\n        except requests.RequestException as err:\n            logger.error("Failed to update status for user %s: %s", user_id, err)\n            return False\n`,
  },
  {
    id: 'markdown-docs',
    name: 'Markdown Documentation',
    category: 'Docs',
    description: 'Documentation change updating API setup instructions and prerequisites',
    language: 'markdown',
    originalFilename: 'README.md (v1.0)',
    modifiedFilename: 'README.md (v2.0)',
    original: `# My Project\n\nQuick installation guide for local environment:\n\n## Prerequisites\n- Node.js 16.x or higher\n- Yarn package manager\n\n## Getting Started\n\`\`\`bash\ngit clone https://github.com/example/repo.git\ncd repo\nyarn install\nyarn start\n\`\`\`\n\nContact support at help@example.com for issues.\n`,
    modified: `# My Modern Platform 🚀\n\nEnterprise-ready cloud developer workspace and analytics dashboard.\n\n## Prerequisites\n- Node.js 20 LTS or Node.js 22 LTS\n- pnpm 9.x (recommended) or npm 10+\n- Docker Desktop 4.25+ (for local microservices)\n\n## Getting Started\n\`\`\`bash\n# Clone the repository\ngit clone https://github.com/example/repo.git\ncd repo\n\n# Install dependencies and start development server\npnpm install\npnpm dev\n\`\`\`\n\n## Community & Support\n- Join our [Discord Server](https://discord.gg/example)\n- Report bugs via [GitHub Issues](https://github.com/example/repo/issues)\n`,
  },
];
