// Basic auth for internal employee access
export function validateBasicAuth(authHeader: string | undefined): boolean {
  if (!authHeader?.startsWith('Basic ')) {
    return false;
  }

  const base64Credentials = authHeader.slice(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  // Use environment variables for credentials
  const validUsername = process.env.INTERNAL_AUTH_USERNAME || 'admin';
  const validPassword = process.env.INTERNAL_AUTH_PASSWORD || 'changeme';

  return username === validUsername && password === validPassword;
}

export function getBasicAuthErrorResponse() {
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid or missing basic authentication credentials',
    }),
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Internal API"',
        'Content-Type': 'application/json',
      },
    }
  );
}
