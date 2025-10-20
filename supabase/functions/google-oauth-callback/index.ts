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
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      const dashboardUrl = new URL('/dashboard', SUPABASE_URL!.replace('.supabase.co', '.lovable.app'));
      dashboardUrl.searchParams.set('oauth', 'error');
      return new Response(
        `<html><body><script>window.location.href = '${dashboardUrl.toString()}';</script><p>Authorization failed. Redirecting...</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      const dashboardUrl = new URL('/dashboard', SUPABASE_URL!.replace('.supabase.co', '.lovable.app'));
      dashboardUrl.searchParams.set('oauth', 'error');
      return new Response(
        `<html><body><script>window.location.href = '${dashboardUrl.toString()}';</script><p>Missing authorization code. Redirecting...</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables');
      const dashboardUrl = '/dashboard?oauth=error';
      return new Response(
        `<html><body><script>window.location.href = '${dashboardUrl}';</script><p>Server configuration error. Redirecting...</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate state token from database
    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state_token', state)
      .eq('used', false)
      .single();

    if (stateError || !oauthState) {
      console.error('Invalid or expired OAuth state:', state);
      const dashboardUrl = '/dashboard?oauth=error';
      return new Response(
        `<html><body><script>window.location.href = '${dashboardUrl}';</script><p>Invalid or expired authorization request. Redirecting...</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Check if state has expired
    if (new Date(oauthState.expires_at) < new Date()) {
      console.error('OAuth state expired:', state);
      const dashboardUrl = '/dashboard?oauth=error';
      return new Response(
        `<html><body><script>window.location.href = '${dashboardUrl}';</script><p>Authorization request expired. Redirecting...</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const { user_id: userId, business_id: businessId, source_id: sourceId } = oauthState;

    // Mark state as used
    await supabase
      .from('oauth_states')
      .update({ used: true })
      .eq('state_token', state);

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
      const dashboardUrl = '/dashboard?oauth=error';
      return new Response(
        `<html><body><script>window.location.href = '${dashboardUrl}';</script><p>Failed to exchange authorization code. Redirecting...</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Update or insert the connection record with user validation
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
      .eq('source_id', sourceId)
      .eq('user_id', userId);

    if (dbError) {
      console.error('Database update error:', dbError);
      const dashboardUrl = '/dashboard?oauth=error';
      return new Response(
        `<html><body><script>window.location.href = '${dashboardUrl}';</script><p>Failed to save connection. Redirecting...</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    console.log('Google OAuth connection successful for business:', businessId);

    // Redirect back to dashboard with success indicator
    const dashboardUrl = new URL('/dashboard', SUPABASE_URL.replace('.supabase.co', '.lovable.app'));
    dashboardUrl.searchParams.set('oauth', 'success');
    dashboardUrl.searchParams.set('source', sourceId);
    
    return new Response(
      `<html><body><script>window.location.href = '${dashboardUrl.toString()}';</script><p>Authorization successful! Redirecting...</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('Error in google-oauth-callback:', error);
    const dashboardUrl = '/dashboard?oauth=error';
    return new Response(
      `<html><body><script>window.location.href = '${dashboardUrl}';</script><p>An error occurred. Redirecting...</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});
