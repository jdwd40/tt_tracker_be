import crypto from 'crypto';

/**
 * Simple in-memory token store for managing refresh tokens
 * In production, this should be replaced with a proper database table
 */
class TokenStore {
  private tokens: Set<string> = new Set();

  /**
   * Add a refresh token to the store
   */
  addToken(token: string): void {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    this.tokens.add(tokenHash);
  }

  /**
   * Check if a refresh token exists in the store
   */
  hasToken(token: string): boolean {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return this.tokens.has(tokenHash);
  }

  /**
   * Remove a refresh token from the store
   */
  removeToken(token: string): void {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    this.tokens.delete(tokenHash);
  }

  /**
   * Clear all tokens (useful for testing)
   */
  clear(): void {
    this.tokens.clear();
  }

  /**
   * Get the number of tokens in the store
   */
  size(): number {
    return this.tokens.size;
  }
}

// Export singleton instance
export const tokenStore = new TokenStore();
