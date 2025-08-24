import type { ProofDataExport } from '../types';

export class GitHubOAuth {
  private static readonly GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize';
  private static readonly GITHUB_API_URL = 'https://api.github.com';
  
  /**
   * Initiates GitHub OAuth flow
   */
  static initiateOAuth(clientId: string): void {
    const redirectUri = encodeURIComponent(window.location.origin + '/callback');
    const scope = encodeURIComponent('gist');
    const state = this.generateState();
    
    // Store state for verification
    sessionStorage.setItem('oauth_state', state);
    
    const authUrl = `${this.GITHUB_OAUTH_URL}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
    
    window.location.href = authUrl;
  }
  
  /**
   * Handles the OAuth callback
   * Note: This requires a backend server to exchange the code for an access token
   */
  static async handleCallback(code: string, state: string): Promise<string | null> {
    const savedState = sessionStorage.getItem('oauth_state');
    
    if (state !== savedState) {
      throw new Error('Invalid OAuth state');
    }
    
    // Clean up stored state
    sessionStorage.removeItem('oauth_state');
    
    // NOTE: The code-to-token exchange must be done on a backend server
    // because it requires the client secret, which should never be exposed
    // to the client-side code
    
    const backendUrl = import.meta.env.OAUTH_API_ENDPOINT;
    
    if (!backendUrl) {
      throw new Error('Backend server not configured for OAuth');
    }
    
    try {
      const response = await fetch(`${backendUrl}/auth/github/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }
      
      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('OAuth callback error:', error);
      return null;
    }
  }
  
  /**
   * Creates a Gist using an access token
   */
  static async createGist(
    accessToken: string,
    proofData: ProofDataExport,
    description: string
  ): Promise<{ url: string; id: string }> {
    const response = await fetch(`${this.GITHUB_API_URL}/gists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description,
        public: true,
        files: {
          'pseudoku_proof.json': {
            content: JSON.stringify(proofData, null, 2)
          }
        }
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create gist: ${error.message}`);
    }
    
    const gist = await response.json();
    return {
      url: gist.html_url,
      id: gist.id,
    };
  }
  
  /**
   * Generates a random state for OAuth
   */
  private static generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Checks if we have a valid token stored
   */
  static getStoredToken(): string | null {
    // For security, tokens should be stored in httpOnly cookies by the backend
    // or in memory only. Never store OAuth tokens in localStorage/sessionStorage
    // in production applications
    return null;
  }
  
  /**
   * Creates a simple backend proxy for GitHub OAuth
   * This is a template for what the backend endpoint should do
   */
  static getBackendTemplate(): string {
    return `
// Example backend endpoint (Node.js/Express)
app.post('/auth/github/callback', async (req, res) => {
  const { code, state } = req.body;
  
  // Verify state parameter
  // Exchange code for access token
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code,
    }),
  });
  
  const data = await response.json();
  
  // Store token securely (e.g., encrypted cookie)
  // Return success response
  res.json({ access_token: data.access_token });
});
    `;
  }
}
