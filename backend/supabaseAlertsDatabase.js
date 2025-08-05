const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class SupabaseAlertsDatabase {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || 'https://xztrjjveapihqqbsgjwk.supabase.co';
    this.supabaseKey = process.env.SUPABASE_ANON_KEY || '';
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }
    
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    console.log('Connected to Supabase database');
  }

  // Store or update an alert
  async storeAlert(alert) {
    try {
      // Parse JSON data if needed for extraction
      const states = typeof alert.states === 'string' ? JSON.parse(alert.states) : alert.states;
      const geometry = typeof alert.geometry === 'string' ? JSON.parse(alert.geometry) : alert.geometry;
      const parameters = typeof alert.parameters === 'string' ? JSON.parse(alert.parameters) : alert.parameters;

      const alertData = {
        id: alert.id,
        producttype: alert.productType,
        affectedarea: alert.affectedArea,
        description: alert.description,
        headline: alert.headline,
        vtec_string: alert.vtecString,
        expires: alert.expires,
        geometry: geometry, // Keep geometry for mapping
        rawdata: alert.rawData,
        updatedat: new Date().toISOString(),
        // Readable columns extracted from JSON
        state_list: Array.isArray(states) ? states.join(', ') : (states || 'N/A'),
        max_hail_size: parameters?.maxHailSize || 'N/A',
        max_wind_gust: parameters?.maxWindGust || 'N/A',
        tornado_detection: parameters?.tornadoDetection || 'N/A',
        wmo_identifier: Array.isArray(parameters?.WMOidentifier) ? parameters.WMOidentifier[0] : (parameters?.WMOidentifier || 'N/A'),
        geometry_type: geometry?.type || 'N/A',
        coordinates_summary: geometry?.coordinates ? `${geometry.coordinates.length} coordinate sets` : 'N/A'
      };

      const { data, error } = await this.supabase
        .from('alerts')
        .upsert(alertData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('Error storing alert:', error);
        throw error;
      }

      console.log(`Alert stored/updated: ${alert.id}`);
      return data;
    } catch (error) {
      console.error('Error in storeAlert:', error);
      throw error;
    }
  }

  // Get all active (non-expired) alerts
  async getActiveAlerts() {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from('alerts')
        .select('*')
        .gt('expires', now)
        .order('createdat', { ascending: false });

      if (error) {
        console.error('Error getting active alerts:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActiveAlerts:', error);
      throw error;
    }
  }

  // Get all alerts with optional limit
  async getAllAlerts(limit = null) {
    try {
      let query = this.supabase
        .from('alerts')
        .select('*')
        .order('createdat', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting all alerts:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllAlerts:', error);
      throw error;
    }
  }

  // Clean up expired alerts
  async cleanupExpiredAlerts() {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from('alerts')
        .delete()
        .lt('expires', now)
        .select();

      if (error) {
        console.error('Error cleaning up expired alerts:', error);
        throw error;
      }

      const deletedCount = data ? data.length : 0;
      return deletedCount;
    } catch (error) {
      console.error('Error in cleanupExpiredAlerts:', error);
      throw error;
    }
  }

  // Get alert by ID
  async getAlertById(id) {
    try {
      const { data, error } = await this.supabase
        .from('alerts')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error getting alert by ID:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getAlertById:', error);
      throw error;
    }
  }

  // Delete alert by ID
  async deleteAlert(id) {
    try {
      const { data, error } = await this.supabase
        .from('alerts')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error deleting alert:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in deleteAlert:', error);
      throw error;
    }
  }

  // Get alerts count
  async getAlertsCount() {
    try {
      const { count, error } = await this.supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error getting alerts count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getAlertsCount:', error);
      throw error;
    }
  }
}

module.exports = SupabaseAlertsDatabase;
