import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return new Response(
        `<html><body><script>window.close();</script><p>Authorization failed. You can close this window.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      return new Response(
        `<html><body><script>window.close();</script><p>Missing authorization code. You can close this window.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables');
      return new Response(
        `<html><body><script>window.close();</script><p>Server configuration error. You can close this window.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Decode state to get businessId and sourceId
    const { businessId, sourceId } = JSON.parse(atob(state));

    // Exchange authorization code for tokens
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(
        `<html><body><script>window.close();</script><p>Failed to exchange authorization code. You can close this window.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Get the authenticated user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Update or insert the connection record
    const { error: dbError } = await supabase
      .from('source_connections')
      .update({
        oauth_token: access_token,
        oauth_refresh_token: refresh_token,
        token_expires_at: expiresAt,
        status: 'connected',
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', businessId)
      .eq('source_id', sourceId);

    if (dbError) {
      console.error('Database update error:', dbError);
      return new Response(
        `<html><body><script>window.close();</script><p>Failed to save connection. You can close this window.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    console.log('Google OAuth connection successful for business:', businessId);

    // Return success page that closes the window
    return new Response(
      `<html><body><script>window.opener?.postMessage({ type: 'oauth-success' }, '*'); window.close();</script><p>Authorization successful! You can close this window.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('Error in google-oauth-callback:', error);
    return new Response(
      `<html><body><script>window.close();</script><p>An error occurred. You can close this window.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});
