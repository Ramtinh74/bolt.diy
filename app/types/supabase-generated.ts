export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
          subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | null
          subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise' | null
          stripe_customer_id: string | null
          usage_credits: number
          usage_limit: number
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | null
          subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise' | null
          stripe_customer_id?: string | null
          usage_credits?: number
          usage_limit?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | null
          subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise' | null
          stripe_customer_id?: string | null
          usage_credits?: number
          usage_limit?: number
        }
      }
      subscriptions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'
          price_id: string
          quantity: number
          cancel_at_period_end: boolean
          current_period_start: string
          current_period_end: string
          ended_at: string | null
          cancel_at: string | null
          canceled_at: string | null
          trial_start: string | null
          trial_end: string | null
          stripe_subscription_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'
          price_id: string
          quantity?: number
          cancel_at_period_end: boolean
          current_period_start: string
          current_period_end: string
          ended_at?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          stripe_subscription_id: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'
          price_id?: string
          quantity?: number
          cancel_at_period_end?: boolean
          current_period_start?: string
          current_period_end?: string
          ended_at?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          stripe_subscription_id?: string
        }
      }
      usage_logs: {
        Row: {
          id: string
          created_at: string
          user_id: string
          action_type: string
          credits_used: number
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          action_type: string
          credits_used: number
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          action_type?: string
          credits_used?: number
          metadata?: Json | null
        }
      }
      prices: {
        Row: {
          id: string
          product_id: string
          active: boolean
          description: string | null
          unit_amount: number
          currency: string
          type: 'one_time' | 'recurring'
          interval: 'day' | 'week' | 'month' | 'year' | null
          interval_count: number | null
          trial_period_days: number | null
          metadata: Json | null
          stripe_price_id: string
        }
        Insert: {
          id?: string
          product_id: string
          active?: boolean
          description?: string | null
          unit_amount: number
          currency: string
          type: 'one_time' | 'recurring'
          interval?: 'day' | 'week' | 'month' | 'year' | null
          interval_count?: number | null
          trial_period_days?: number | null
          metadata?: Json | null
          stripe_price_id: string
        }
        Update: {
          id?: string
          product_id?: string
          active?: boolean
          description?: string | null
          unit_amount?: number
          currency?: string
          type?: 'one_time' | 'recurring'
          interval?: 'day' | 'week' | 'month' | 'year' | null
          interval_count?: number | null
          trial_period_days?: number | null
          metadata?: Json | null
          stripe_price_id?: string
        }
      }
      products: {
        Row: {
          id: string
          active: boolean
          name: string
          description: string | null
          image: string | null
          metadata: Json | null
          stripe_product_id: string
        }
        Insert: {
          id?: string
          active?: boolean
          name: string
          description?: string | null
          image?: string | null
          metadata?: Json | null
          stripe_product_id: string
        }
        Update: {
          id?: string
          active?: boolean
          name?: string
          description?: string | null
          image?: string | null
          metadata?: Json | null
          stripe_product_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}