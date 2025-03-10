export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      action: {
        Row: {
          id: string
          matrix: string
          name: string
          node_type: string
          reference_id: string
          transformer: string | null
        }
        Insert: {
          id?: string
          matrix: string
          name: string
          node_type: string
          reference_id: string
          transformer?: string | null
        }
        Update: {
          id?: string
          matrix?: string
          name?: string
          node_type?: string
          reference_id?: string
          transformer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_matrix_fkey"
            columns: ["matrix"]
            isOneToOne: false
            referencedRelation: "automation_matrix"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_transformer_fkey"
            columns: ["transformer"]
            isOneToOne: false
            referencedRelation: "transformer"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent: {
        Row: {
          ai_settings_id: string | null
          id: string
          name: string
          recipe_id: string | null
          system_message_override: string | null
        }
        Insert: {
          ai_settings_id?: string | null
          id?: string
          name: string
          recipe_id?: string | null
          system_message_override?: string | null
        }
        Update: {
          ai_settings_id?: string | null
          id?: string
          name?: string
          recipe_id?: string | null
          system_message_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_ai_settings_id_fkey"
            columns: ["ai_settings_id"]
            isOneToOne: false
            referencedRelation: "ai_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_endpoint: {
        Row: {
          additional_cost: boolean | null
          cost_details: Json | null
          description: string | null
          id: string
          name: string
          params: Json | null
          provider: string | null
        }
        Insert: {
          additional_cost?: boolean | null
          cost_details?: Json | null
          description?: string | null
          id?: string
          name: string
          params?: Json | null
          provider?: string | null
        }
        Update: {
          additional_cost?: boolean | null
          cost_details?: Json | null
          description?: string | null
          id?: string
          name?: string
          params?: Json | null
          provider?: string | null
        }
        Relationships: []
      }
      ai_model: {
        Row: {
          capabilities: Json | null
          common_name: string | null
          context_window: number | null
          controls: Json | null
          endpoints: Json | null
          id: string
          max_tokens: number | null
          model_class: string
          model_provider: string | null
          name: string
          provider: string | null
        }
        Insert: {
          capabilities?: Json | null
          common_name?: string | null
          context_window?: number | null
          controls?: Json | null
          endpoints?: Json | null
          id?: string
          max_tokens?: number | null
          model_class: string
          model_provider?: string | null
          name: string
          provider?: string | null
        }
        Update: {
          capabilities?: Json | null
          common_name?: string | null
          context_window?: number | null
          controls?: Json | null
          endpoints?: Json | null
          id?: string
          max_tokens?: number | null
          model_class?: string
          model_provider?: string | null
          name?: string
          provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_model_provider_fkey"
            columns: ["model_provider"]
            isOneToOne: false
            referencedRelation: "ai_provider"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_endpoint: {
        Row: {
          ai_endpoint_id: string | null
          ai_model_id: string | null
          available: boolean
          configuration: Json | null
          created_at: string
          endpoint_priority: number | null
          id: string
          notes: string | null
        }
        Insert: {
          ai_endpoint_id?: string | null
          ai_model_id?: string | null
          available?: boolean
          configuration?: Json | null
          created_at?: string
          endpoint_priority?: number | null
          id?: string
          notes?: string | null
        }
        Update: {
          ai_endpoint_id?: string | null
          ai_model_id?: string | null
          available?: boolean
          configuration?: Json | null
          created_at?: string
          endpoint_priority?: number | null
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_endpoint_ai_endpoint_id_fkey"
            columns: ["ai_endpoint_id"]
            isOneToOne: false
            referencedRelation: "ai_endpoint"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_model_endpoint_ai_model_id_fkey"
            columns: ["ai_model_id"]
            isOneToOne: false
            referencedRelation: "ai_model"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider: {
        Row: {
          company_description: string | null
          documentation_link: string | null
          id: string
          models_link: string | null
          name: string | null
        }
        Insert: {
          company_description?: string | null
          documentation_link?: string | null
          id?: string
          models_link?: string | null
          name?: string | null
        }
        Update: {
          company_description?: string | null
          documentation_link?: string | null
          id?: string
          models_link?: string | null
          name?: string | null
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          ai_endpoint: string | null
          ai_model: string | null
          ai_provider: string | null
          audio_format: string | null
          audio_voice: string | null
          count: number | null
          frequency_penalty: number | null
          id: string
          max_tokens: number | null
          modalities: Json | null
          presence_penalty: number | null
          preset_name: string | null
          quality: string | null
          response_format: string | null
          size: string | null
          stream: boolean | null
          temperature: number | null
          tools: Json | null
          top_p: number | null
        }
        Insert: {
          ai_endpoint?: string | null
          ai_model?: string | null
          ai_provider?: string | null
          audio_format?: string | null
          audio_voice?: string | null
          count?: number | null
          frequency_penalty?: number | null
          id?: string
          max_tokens?: number | null
          modalities?: Json | null
          presence_penalty?: number | null
          preset_name?: string | null
          quality?: string | null
          response_format?: string | null
          size?: string | null
          stream?: boolean | null
          temperature?: number | null
          tools?: Json | null
          top_p?: number | null
        }
        Update: {
          ai_endpoint?: string | null
          ai_model?: string | null
          ai_provider?: string | null
          audio_format?: string | null
          audio_voice?: string | null
          count?: number | null
          frequency_penalty?: number | null
          id?: string
          max_tokens?: number | null
          modalities?: Json | null
          presence_penalty?: number | null
          preset_name?: string | null
          quality?: string | null
          response_format?: string | null
          size?: string | null
          stream?: boolean | null
          temperature?: number | null
          tools?: Json | null
          top_p?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_ai_endpoint_fkey"
            columns: ["ai_endpoint"]
            isOneToOne: false
            referencedRelation: "ai_endpoint"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_settings_ai_model_fkey"
            columns: ["ai_model"]
            isOneToOne: false
            referencedRelation: "ai_model"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_settings_ai_provider_fkey"
            columns: ["ai_provider"]
            isOneToOne: false
            referencedRelation: "ai_provider"
            referencedColumns: ["id"]
          },
        ]
      }
      applet: {
        Row: {
          compiled_recipe_id: string | null
          created_at: string
          creator: string | null
          cta_text: string | null
          data_source_config: Json | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          next_step_config: Json | null
          result_component_config: Json | null
          slug: string
          subcategory_id: string | null
          theme: string | null
          type: Database["public"]["Enums"]["app_type"]
          user_id: string | null
        }
        Insert: {
          compiled_recipe_id?: string | null
          created_at?: string
          creator?: string | null
          cta_text?: string | null
          data_source_config?: Json | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          next_step_config?: Json | null
          result_component_config?: Json | null
          slug: string
          subcategory_id?: string | null
          theme?: string | null
          type: Database["public"]["Enums"]["app_type"]
          user_id?: string | null
        }
        Update: {
          compiled_recipe_id?: string | null
          created_at?: string
          creator?: string | null
          cta_text?: string | null
          data_source_config?: Json | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          next_step_config?: Json | null
          result_component_config?: Json | null
          slug?: string
          subcategory_id?: string | null
          theme?: string | null
          type?: Database["public"]["Enums"]["app_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applet_compiled_recipe_id_fkey"
            columns: ["compiled_recipe_id"]
            isOneToOne: false
            referencedRelation: "compiled_recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applet_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategory"
            referencedColumns: ["id"]
          },
        ]
      }
      arg: {
        Row: {
          data_type: Database["public"]["Enums"]["data_type"] | null
          default: string | null
          id: string
          name: string
          ready: boolean | null
          registered_function: string | null
          required: boolean | null
        }
        Insert: {
          data_type?: Database["public"]["Enums"]["data_type"] | null
          default?: string | null
          id?: string
          name: string
          ready?: boolean | null
          registered_function?: string | null
          required?: boolean | null
        }
        Update: {
          data_type?: Database["public"]["Enums"]["data_type"] | null
          default?: string | null
          id?: string
          name?: string
          ready?: boolean | null
          registered_function?: string | null
          required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "args_registered_function_fkey"
            columns: ["registered_function"]
            isOneToOne: false
            referencedRelation: "registered_function"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "args_registered_function_fkey"
            columns: ["registered_function"]
            isOneToOne: false
            referencedRelation: "view_registered_function"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "args_registered_function_fkey"
            columns: ["registered_function"]
            isOneToOne: false
            referencedRelation: "view_registered_function_all_rels"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_label: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      audio_recording: {
        Row: {
          created_at: string
          duration: number | null
          file_url: string
          id: string
          is_public: boolean
          label: string | null
          local_path: string | null
          name: string
          size: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          file_url: string
          id?: string
          is_public?: boolean
          label?: string | null
          local_path?: string | null
          name: string
          size?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          file_url?: string
          id?: string
          is_public?: boolean
          label?: string | null
          local_path?: string | null
          name?: string
          size?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_recording_label_fkey"
            columns: ["label"]
            isOneToOne: false
            referencedRelation: "audio_label"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_recording_users: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
        }
        Relationships: []
      }
      automation_boundary_broker: {
        Row: {
          beacon_destination:
            | Database["public"]["Enums"]["data_destination"]
            | null
          broker: string | null
          id: string
          matrix: string | null
          spark_source: Database["public"]["Enums"]["data_source"] | null
        }
        Insert: {
          beacon_destination?:
            | Database["public"]["Enums"]["data_destination"]
            | null
          broker?: string | null
          id?: string
          matrix?: string | null
          spark_source?: Database["public"]["Enums"]["data_source"] | null
        }
        Update: {
          beacon_destination?:
            | Database["public"]["Enums"]["data_destination"]
            | null
          broker?: string | null
          id?: string
          matrix?: string | null
          spark_source?: Database["public"]["Enums"]["data_source"] | null
        }
        Relationships: [
          {
            foreignKeyName: "boundary_brokers_broker_fkey"
            columns: ["broker"]
            isOneToOne: false
            referencedRelation: "broker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boundary_brokers_broker_fkey"
            columns: ["broker"]
            isOneToOne: false
            referencedRelation: "view_registered_function_all_rels"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "boundary_brokers_matrix_fkey"
            columns: ["matrix"]
            isOneToOne: false
            referencedRelation: "automation_matrix"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_matrix: {
        Row: {
          average_seconds: number | null
          cognition_matrices:
            | Database["public"]["Enums"]["cognition_matrices"]
            | null
          description: string | null
          id: string
          is_automated: boolean | null
          name: string
        }
        Insert: {
          average_seconds?: number | null
          cognition_matrices?:
            | Database["public"]["Enums"]["cognition_matrices"]
            | null
          description?: string | null
          id?: string
          is_automated?: boolean | null
          name: string
        }
        Update: {
          average_seconds?: number | null
          cognition_matrices?:
            | Database["public"]["Enums"]["cognition_matrices"]
            | null
          description?: string | null
          id?: string
          is_automated?: boolean | null
          name?: string
        }
        Relationships: []
      }
      broker: {
        Row: {
          additional_params: Json | null
          custom_source_component: string | null
          data_type: Database["public"]["Enums"]["data_type"]
          default_destination:
            | Database["public"]["Enums"]["data_destination"]
            | null
          default_source: Database["public"]["Enums"]["data_source"] | null
          description: string | null
          display_name: string | null
          id: string
          name: string
          other_source_params: Json | null
          output_component:
            | Database["public"]["Enums"]["destination_component"]
            | null
          ready: boolean | null
          sample_entries: string | null
          string_value: string | null
          tags: Json | null
          tooltip: string | null
          validation_rules: Json | null
          value: Json | null
        }
        Insert: {
          additional_params?: Json | null
          custom_source_component?: string | null
          data_type?: Database["public"]["Enums"]["data_type"]
          default_destination?:
            | Database["public"]["Enums"]["data_destination"]
            | null
          default_source?: Database["public"]["Enums"]["data_source"] | null
          description?: string | null
          display_name?: string | null
          id?: string
          name: string
          other_source_params?: Json | null
          output_component?:
            | Database["public"]["Enums"]["destination_component"]
            | null
          ready?: boolean | null
          sample_entries?: string | null
          string_value?: string | null
          tags?: Json | null
          tooltip?: string | null
          validation_rules?: Json | null
          value?: Json | null
        }
        Update: {
          additional_params?: Json | null
          custom_source_component?: string | null
          data_type?: Database["public"]["Enums"]["data_type"]
          default_destination?:
            | Database["public"]["Enums"]["data_destination"]
            | null
          default_source?: Database["public"]["Enums"]["data_source"] | null
          description?: string | null
          display_name?: string | null
          id?: string
          name?: string
          other_source_params?: Json | null
          output_component?:
            | Database["public"]["Enums"]["destination_component"]
            | null
          ready?: boolean | null
          sample_entries?: string | null
          string_value?: string | null
          tags?: Json | null
          tooltip?: string | null
          validation_rules?: Json | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_custom_component_fkey"
            columns: ["custom_source_component"]
            isOneToOne: false
            referencedRelation: "data_input_component"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_value: {
        Row: {
          category: string | null
          comments: string | null
          created_at: string
          data: Json | null
          data_broker: string | null
          id: string
          sub_category: string | null
          tags: string[] | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          comments?: string | null
          created_at?: string
          data?: Json | null
          data_broker?: string | null
          id?: string
          sub_category?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          comments?: string | null
          created_at?: string
          data?: Json | null
          data_broker?: string | null
          id?: string
          sub_category?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_value_data_broker_fkey"
            columns: ["data_broker"]
            isOneToOne: false
            referencedRelation: "data_broker"
            referencedColumns: ["id"]
          },
        ]
      }
      bucket_structures: {
        Row: {
          bucket_id: string
          last_updated: string | null
          structure: Json | null
        }
        Insert: {
          bucket_id: string
          last_updated?: string | null
          structure?: Json | null
        }
        Update: {
          bucket_id?: string
          last_updated?: string | null
          structure?: Json | null
        }
        Relationships: []
      }
      bucket_tree_structures: {
        Row: {
          bucket_id: string
          last_updated: string | null
          tree_structure: Json | null
        }
        Insert: {
          bucket_id: string
          last_updated?: string | null
          tree_structure?: Json | null
        }
        Update: {
          bucket_id?: string
          last_updated?: string | null
          tree_structure?: Json | null
        }
        Relationships: []
      }
      category: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      compiled_recipe: {
        Row: {
          authenticated_read: boolean
          compiled_recipe: Json
          created_at: string
          id: string
          is_public: boolean
          recipe_id: string | null
          updated_at: string
          user_id: string | null
          version: number | null
        }
        Insert: {
          authenticated_read?: boolean
          compiled_recipe: Json
          created_at?: string
          id?: string
          is_public?: boolean
          recipe_id?: string | null
          updated_at?: string
          user_id?: string | null
          version?: number | null
        }
        Update: {
          authenticated_read?: boolean
          compiled_recipe?: Json
          created_at?: string
          id?: string
          is_public?: boolean
          recipe_id?: string | null
          updated_at?: string
          user_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compiled_recipe_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      data_broker: {
        Row: {
          color: Database["public"]["Enums"]["color"] | null
          data_type: Database["public"]["Enums"]["data_type"] | null
          default_value: string | null
          id: string
          input_component: string | null
          name: string
          output_component: string | null
        }
        Insert: {
          color?: Database["public"]["Enums"]["color"] | null
          data_type?: Database["public"]["Enums"]["data_type"] | null
          default_value?: string | null
          id?: string
          input_component?: string | null
          name: string
          output_component?: string | null
        }
        Update: {
          color?: Database["public"]["Enums"]["color"] | null
          data_type?: Database["public"]["Enums"]["data_type"] | null
          default_value?: string | null
          id?: string
          input_component?: string | null
          name?: string
          output_component?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_broker_default_component_fkey"
            columns: ["input_component"]
            isOneToOne: false
            referencedRelation: "data_input_component"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_broker_output_component_fkey"
            columns: ["output_component"]
            isOneToOne: false
            referencedRelation: "data_output_component"
            referencedColumns: ["id"]
          },
        ]
      }
      data_input_component: {
        Row: {
          acceptable_filetypes: Json | null
          additional_params: Json | null
          collapsible_class_name: string | null
          color_overrides: Json | null
          component: Database["public"]["Enums"]["default_component"]
          component_class_name: string | null
          container_class_name: string | null
          description: string | null
          description_class_name: string | null
          height: Database["public"]["Enums"]["size"] | null
          id: string
          include_other: boolean | null
          label_class_name: string | null
          max: number | null
          max_height: Database["public"]["Enums"]["size"] | null
          max_width: Database["public"]["Enums"]["size"] | null
          min: number | null
          min_height: Database["public"]["Enums"]["size"] | null
          min_width: Database["public"]["Enums"]["size"] | null
          name: string | null
          options: string[] | null
          orientation: Database["public"]["Enums"]["orientation"] | null
          placeholder: string | null
          size: Database["public"]["Enums"]["size"] | null
          src: string | null
          step: number | null
          sub_component: string | null
          width: Database["public"]["Enums"]["size"] | null
        }
        Insert: {
          acceptable_filetypes?: Json | null
          additional_params?: Json | null
          collapsible_class_name?: string | null
          color_overrides?: Json | null
          component?: Database["public"]["Enums"]["default_component"]
          component_class_name?: string | null
          container_class_name?: string | null
          description?: string | null
          description_class_name?: string | null
          height?: Database["public"]["Enums"]["size"] | null
          id?: string
          include_other?: boolean | null
          label_class_name?: string | null
          max?: number | null
          max_height?: Database["public"]["Enums"]["size"] | null
          max_width?: Database["public"]["Enums"]["size"] | null
          min?: number | null
          min_height?: Database["public"]["Enums"]["size"] | null
          min_width?: Database["public"]["Enums"]["size"] | null
          name?: string | null
          options?: string[] | null
          orientation?: Database["public"]["Enums"]["orientation"] | null
          placeholder?: string | null
          size?: Database["public"]["Enums"]["size"] | null
          src?: string | null
          step?: number | null
          sub_component?: string | null
          width?: Database["public"]["Enums"]["size"] | null
        }
        Update: {
          acceptable_filetypes?: Json | null
          additional_params?: Json | null
          collapsible_class_name?: string | null
          color_overrides?: Json | null
          component?: Database["public"]["Enums"]["default_component"]
          component_class_name?: string | null
          container_class_name?: string | null
          description?: string | null
          description_class_name?: string | null
          height?: Database["public"]["Enums"]["size"] | null
          id?: string
          include_other?: boolean | null
          label_class_name?: string | null
          max?: number | null
          max_height?: Database["public"]["Enums"]["size"] | null
          max_width?: Database["public"]["Enums"]["size"] | null
          min?: number | null
          min_height?: Database["public"]["Enums"]["size"] | null
          min_width?: Database["public"]["Enums"]["size"] | null
          name?: string | null
          options?: string[] | null
          orientation?: Database["public"]["Enums"]["orientation"] | null
          placeholder?: string | null
          size?: Database["public"]["Enums"]["size"] | null
          src?: string | null
          step?: number | null
          sub_component?: string | null
          width?: Database["public"]["Enums"]["size"] | null
        }
        Relationships: []
      }
      data_output_component: {
        Row: {
          additional_params: Json | null
          component_type:
            | Database["public"]["Enums"]["destination_component"]
            | null
          id: string
          props: Json | null
          ui_component: string | null
        }
        Insert: {
          additional_params?: Json | null
          component_type?:
            | Database["public"]["Enums"]["destination_component"]
            | null
          id?: string
          props?: Json | null
          ui_component?: string | null
        }
        Update: {
          additional_params?: Json | null
          component_type?:
            | Database["public"]["Enums"]["destination_component"]
            | null
          id?: string
          props?: Json | null
          ui_component?: string | null
        }
        Relationships: []
      }
      display_option: {
        Row: {
          additional_params: Json | null
          customizable_params: Json | null
          default_params: Json | null
          id: string
          name: string | null
        }
        Insert: {
          additional_params?: Json | null
          customizable_params?: Json | null
          default_params?: Json | null
          id?: string
          name?: string | null
        }
        Update: {
          additional_params?: Json | null
          customizable_params?: Json | null
          default_params?: Json | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      emails: {
        Row: {
          body: string
          id: string
          is_read: boolean | null
          recipient: string
          sender: string
          subject: string
          timestamp: string | null
        }
        Insert: {
          body: string
          id?: string
          is_read?: boolean | null
          recipient: string
          sender: string
          subject: string
          timestamp?: string | null
        }
        Update: {
          body?: string
          id?: string
          is_read?: boolean | null
          recipient?: string
          sender?: string
          subject?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      extractor: {
        Row: {
          default_identifier: string | null
          default_index: number | null
          id: string
          name: string
          output_type: Database["public"]["Enums"]["data_type"] | null
        }
        Insert: {
          default_identifier?: string | null
          default_index?: number | null
          id?: string
          name: string
          output_type?: Database["public"]["Enums"]["data_type"] | null
        }
        Update: {
          default_identifier?: string | null
          default_index?: number | null
          id?: string
          name?: string
          output_type?: Database["public"]["Enums"]["data_type"] | null
        }
        Relationships: []
      }
      file_structure: {
        Row: {
          bucket_id: string
          created_at: string | null
          file_id: string | null
          id: number
          is_folder: boolean
          metadata: Json | null
          name: string
          parent_path: string | null
          path: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          file_id?: string | null
          id?: number
          is_folder: boolean
          metadata?: Json | null
          name: string
          parent_path?: string | null
          path: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          file_id?: string | null
          id?: number
          is_folder?: boolean
          metadata?: Json | null
          name?: string
          parent_path?: string | null
          path?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      flashcard_data: {
        Row: {
          audio_explanation: string | null
          back: string
          created_at: string | null
          detailed_explanation: string | null
          difficulty: string | null
          example: string | null
          front: string
          id: string
          is_deleted: boolean | null
          lesson: string | null
          personal_notes: string | null
          public: boolean | null
          shared_with: string[] | null
          topic: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_explanation?: string | null
          back: string
          created_at?: string | null
          detailed_explanation?: string | null
          difficulty?: string | null
          example?: string | null
          front: string
          id?: string
          is_deleted?: boolean | null
          lesson?: string | null
          personal_notes?: string | null
          public?: boolean | null
          shared_with?: string[] | null
          topic?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_explanation?: string | null
          back?: string
          created_at?: string | null
          detailed_explanation?: string | null
          difficulty?: string | null
          example?: string | null
          front?: string
          id?: string
          is_deleted?: boolean | null
          lesson?: string | null
          personal_notes?: string | null
          public?: boolean | null
          shared_with?: string[] | null
          topic?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flashcard_history: {
        Row: {
          correct_count: number | null
          created_at: string | null
          flashcard_id: string | null
          id: string
          incorrect_count: number | null
          review_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          correct_count?: number | null
          created_at?: string | null
          flashcard_id?: string | null
          id?: string
          incorrect_count?: number | null
          review_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          correct_count?: number | null
          created_at?: string | null
          flashcard_id?: string | null
          id?: string
          incorrect_count?: number | null
          review_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_history_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcard_data"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_images: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          flashcard_id: string | null
          id: string
          mime_type: string
          size: number
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          flashcard_id?: string | null
          id?: string
          mime_type: string
          size: number
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          flashcard_id?: string | null
          id?: string
          mime_type?: string
          size?: number
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_images_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcard_data"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_set_relations: {
        Row: {
          flashcard_id: string
          order: number | null
          set_id: string
        }
        Insert: {
          flashcard_id: string
          order?: number | null
          set_id: string
        }
        Update: {
          flashcard_id?: string
          order?: number | null
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_set_relations_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcard_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_set_relations_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "flashcard_sets"
            referencedColumns: ["set_id"]
          },
        ]
      }
      flashcard_sets: {
        Row: {
          audio_overview: string | null
          created_at: string | null
          difficulty: string | null
          lesson: string | null
          name: string
          public: boolean | null
          set_id: string
          shared_with: string[] | null
          topic: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_overview?: string | null
          created_at?: string | null
          difficulty?: string | null
          lesson?: string | null
          name: string
          public?: boolean | null
          set_id?: string
          shared_with?: string[] | null
          topic?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_overview?: string | null
          created_at?: string | null
          difficulty?: string | null
          lesson?: string | null
          name?: string
          public?: boolean | null
          set_id?: string
          shared_with?: string[] | null
          topic?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      message: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          display_order: number | null
          id: string
          metadata: Json | null
          role: Database["public"]["Enums"]["message_role"]
          system_order: number | null
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          metadata?: Json | null
          role: Database["public"]["Enums"]["message_role"]
          system_order?: number | null
          type: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["message_role"]
          system_order?: number | null
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "message_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
        ]
      }
      message_broker: {
        Row: {
          broker_id: string
          default_component: string | null
          default_value: string | null
          id: string
          message_id: string
        }
        Insert: {
          broker_id: string
          default_component?: string | null
          default_value?: string | null
          id?: string
          message_id: string
        }
        Update: {
          broker_id?: string
          default_component?: string | null
          default_value?: string | null
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_broker_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "data_broker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_broker_default_component_fkey"
            columns: ["default_component"]
            isOneToOne: false
            referencedRelation: "data_input_component"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_broker_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "message_template"
            referencedColumns: ["id"]
          },
        ]
      }
      message_template: {
        Row: {
          content: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["message_role"]
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["message_role"]
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["message_role"]
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: []
      }
      processor: {
        Row: {
          default_extractors: Json | null
          depends_default: string | null
          id: string
          name: string
          params: Json | null
        }
        Insert: {
          default_extractors?: Json | null
          depends_default?: string | null
          id?: string
          name: string
          params?: Json | null
        }
        Update: {
          default_extractors?: Json | null
          depends_default?: string | null
          id?: string
          name?: string
          params?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "processors_depends_default_fkey"
            columns: ["depends_default"]
            isOneToOne: false
            referencedRelation: "processor"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          project_id: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          role: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recipe: {
        Row: {
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          post_result_options: Json | null
          sample_output: string | null
          status: Database["public"]["Enums"]["recipe_status"]
          tags: Json | null
          version: number | null
        }
        Insert: {
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          post_result_options?: Json | null
          sample_output?: string | null
          status?: Database["public"]["Enums"]["recipe_status"]
          tags?: Json | null
          version?: number | null
        }
        Update: {
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          post_result_options?: Json | null
          sample_output?: string | null
          status?: Database["public"]["Enums"]["recipe_status"]
          tags?: Json | null
          version?: number | null
        }
        Relationships: []
      }
      recipe_broker: {
        Row: {
          broker: string
          broker_role: Database["public"]["Enums"]["broker_role"]
          id: string
          recipe: string
          required: boolean | null
        }
        Insert: {
          broker: string
          broker_role: Database["public"]["Enums"]["broker_role"]
          id?: string
          recipe: string
          required?: boolean | null
        }
        Update: {
          broker?: string
          broker_role?: Database["public"]["Enums"]["broker_role"]
          id?: string
          recipe?: string
          required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_broker_broker_fkey"
            columns: ["broker"]
            isOneToOne: false
            referencedRelation: "broker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_broker_broker_fkey"
            columns: ["broker"]
            isOneToOne: false
            referencedRelation: "view_registered_function_all_rels"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "recipe_broker_recipe_fkey"
            columns: ["recipe"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_display: {
        Row: {
          display: string
          display_settings: Json | null
          id: string
          priority: number | null
          recipe: string
        }
        Insert: {
          display: string
          display_settings?: Json | null
          id?: string
          priority?: number | null
          recipe: string
        }
        Update: {
          display?: string
          display_settings?: Json | null
          id?: string
          priority?: number | null
          recipe?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_display_display_fkey"
            columns: ["display"]
            isOneToOne: false
            referencedRelation: "display_option"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_display_recipe_fkey"
            columns: ["recipe"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_function: {
        Row: {
          function: string
          id: string
          params: Json | null
          recipe: string
          role: Database["public"]["Enums"]["function_role"]
        }
        Insert: {
          function: string
          id?: string
          params?: Json | null
          recipe: string
          role: Database["public"]["Enums"]["function_role"]
        }
        Update: {
          function?: string
          id?: string
          params?: Json | null
          recipe?: string
          role?: Database["public"]["Enums"]["function_role"]
        }
        Relationships: [
          {
            foreignKeyName: "recipe_function_function_fkey"
            columns: ["function"]
            isOneToOne: false
            referencedRelation: "system_function"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_function_recipe_fkey"
            columns: ["recipe"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_message: {
        Row: {
          id: string
          message_id: string
          order: number
          recipe_id: string
        }
        Insert: {
          id?: string
          message_id: string
          order?: number
          recipe_id: string
        }
        Update: {
          id?: string
          message_id?: string
          order?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_message_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "message_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_message_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_message_reorder_queue: {
        Row: {
          last_modified: string | null
          recipe_id: string
        }
        Insert: {
          last_modified?: string | null
          recipe_id: string
        }
        Update: {
          last_modified?: string | null
          recipe_id?: string
        }
        Relationships: []
      }
      recipe_model: {
        Row: {
          ai_model: string
          id: string
          priority: number | null
          recipe: string
          role: Database["public"]["Enums"]["model_role"]
        }
        Insert: {
          ai_model: string
          id?: string
          priority?: number | null
          recipe: string
          role?: Database["public"]["Enums"]["model_role"]
        }
        Update: {
          ai_model?: string
          id?: string
          priority?: number | null
          recipe?: string
          role?: Database["public"]["Enums"]["model_role"]
        }
        Relationships: [
          {
            foreignKeyName: "recipe_model_ai_model_fkey"
            columns: ["ai_model"]
            isOneToOne: false
            referencedRelation: "ai_model"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_model_recipe_fkey"
            columns: ["recipe"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_processor: {
        Row: {
          id: string
          params: Json | null
          processor: string
          recipe: string
        }
        Insert: {
          id?: string
          params?: Json | null
          processor: string
          recipe: string
        }
        Update: {
          id?: string
          params?: Json | null
          processor?: string
          recipe?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_processor_processor_fkey"
            columns: ["processor"]
            isOneToOne: false
            referencedRelation: "processor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_processor_recipe_fkey"
            columns: ["recipe"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_tool: {
        Row: {
          id: string
          params: Json | null
          recipe: string
          tool: string
        }
        Insert: {
          id?: string
          params?: Json | null
          recipe: string
          tool: string
        }
        Update: {
          id?: string
          params?: Json | null
          recipe?: string
          tool?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_tool_recipe_fkey"
            columns: ["recipe"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_tool_tool_fkey"
            columns: ["tool"]
            isOneToOne: false
            referencedRelation: "tool"
            referencedColumns: ["id"]
          },
        ]
      }
      registered_function: {
        Row: {
          class_name: string | null
          description: string | null
          id: string
          module_path: string
          name: string
          return_broker: string | null
        }
        Insert: {
          class_name?: string | null
          description?: string | null
          id?: string
          module_path: string
          name: string
          return_broker?: string | null
        }
        Update: {
          class_name?: string | null
          description?: string | null
          id?: string
          module_path?: string
          name?: string
          return_broker?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registered_function_return_broker_fkey"
            columns: ["return_broker"]
            isOneToOne: false
            referencedRelation: "broker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registered_function_return_broker_fkey"
            columns: ["return_broker"]
            isOneToOne: false
            referencedRelation: "view_registered_function_all_rels"
            referencedColumns: ["broker_id"]
          },
        ]
      }
      subcategory: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          features: string[]
          icon: string | null
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          features: string[]
          icon?: string | null
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          features?: string[]
          icon?: string | null
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategory_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
        ]
      }
      system_function: {
        Row: {
          description: string | null
          id: string
          input_params: Json | null
          name: string
          output_options: Json | null
          rf_id: string
          sample: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          input_params?: Json | null
          name: string
          output_options?: Json | null
          rf_id: string
          sample?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          input_params?: Json | null
          name?: string
          output_options?: Json | null
          rf_id?: string
          sample?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_function_function_fkey"
            columns: ["rf_id"]
            isOneToOne: false
            referencedRelation: "registered_function"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_function_function_fkey"
            columns: ["rf_id"]
            isOneToOne: false
            referencedRelation: "view_registered_function"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_function_function_fkey"
            columns: ["rf_id"]
            isOneToOne: false
            referencedRelation: "view_registered_function_all_rels"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          task_id: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          task_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          task_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          task_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          project_id: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tool: {
        Row: {
          additional_params: Json | null
          description: string | null
          id: string
          name: string
          parameters: Json | null
          required_args: Json | null
          source: Json
          system_function: string | null
        }
        Insert: {
          additional_params?: Json | null
          description?: string | null
          id?: string
          name: string
          parameters?: Json | null
          required_args?: Json | null
          source?: Json
          system_function?: string | null
        }
        Update: {
          additional_params?: Json | null
          description?: string | null
          id?: string
          name?: string
          parameters?: Json | null
          required_args?: Json | null
          source?: Json
          system_function?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_system_function_fkey"
            columns: ["system_function"]
            isOneToOne: false
            referencedRelation: "system_function"
            referencedColumns: ["id"]
          },
        ]
      }
      transformer: {
        Row: {
          id: string
          input_params: Json | null
          name: string | null
          output_params: Json | null
        }
        Insert: {
          id?: string
          input_params?: Json | null
          name?: string | null
          output_params?: Json | null
        }
        Update: {
          id?: string
          input_params?: Json | null
          name?: string | null
          output_params?: Json | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          preferences: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wc_claim: {
        Row: {
          age_at_doi: number | null
          applicant_name: string | null
          created_at: string
          date_of_birth: string | null
          date_of_injury: string | null
          id: string
          occupational_code: number | null
          person_id: string | null
          weekly_earnings: number | null
        }
        Insert: {
          age_at_doi?: number | null
          applicant_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_injury?: string | null
          id?: string
          occupational_code?: number | null
          person_id?: string | null
          weekly_earnings?: number | null
        }
        Update: {
          age_at_doi?: number | null
          applicant_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_injury?: string | null
          id?: string
          occupational_code?: number | null
          person_id?: string | null
          weekly_earnings?: number | null
        }
        Relationships: []
      }
      wc_impairment_definition: {
        Row: {
          attributes: Json | null
          fec_rank: number | null
          finger_type: Database["public"]["Enums"]["wc_finger_type"] | null
          id: string
          impairment_number: string | null
          name: string | null
        }
        Insert: {
          attributes?: Json | null
          fec_rank?: number | null
          finger_type?: Database["public"]["Enums"]["wc_finger_type"] | null
          id?: string
          impairment_number?: string | null
          name?: string | null
        }
        Update: {
          attributes?: Json | null
          fec_rank?: number | null
          finger_type?: Database["public"]["Enums"]["wc_finger_type"] | null
          id?: string
          impairment_number?: string | null
          name?: string | null
        }
        Relationships: []
      }
      wc_injury: {
        Row: {
          created_at: string
          digit: number | null
          formula: string | null
          id: string
          impairment_definition_id: string | null
          industrial: number | null
          le: number | null
          pain: number | null
          rating: number | null
          report_id: string | null
          side: Database["public"]["Enums"]["wc_side"] | null
          ue: number | null
          updated_at: string | null
          wpi: number | null
        }
        Insert: {
          created_at?: string
          digit?: number | null
          formula?: string | null
          id?: string
          impairment_definition_id?: string | null
          industrial?: number | null
          le?: number | null
          pain?: number | null
          rating?: number | null
          report_id?: string | null
          side?: Database["public"]["Enums"]["wc_side"] | null
          ue?: number | null
          updated_at?: string | null
          wpi?: number | null
        }
        Update: {
          created_at?: string
          digit?: number | null
          formula?: string | null
          id?: string
          impairment_definition_id?: string | null
          industrial?: number | null
          le?: number | null
          pain?: number | null
          rating?: number | null
          report_id?: string | null
          side?: Database["public"]["Enums"]["wc_side"] | null
          ue?: number | null
          updated_at?: string | null
          wpi?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wc_injury_impairment_definition_id_fkey"
            columns: ["impairment_definition_id"]
            isOneToOne: false
            referencedRelation: "wc_impairment_definition"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc_injury_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "wc_report"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_report: {
        Row: {
          claim_id: string
          compensation_amount: number | null
          compensation_days: number | null
          compensation_weeks: number | null
          created_at: string
          default_side_total: number | null
          final_rating: number | null
          id: string
          left_side_total: number | null
          right_side_total: number | null
        }
        Insert: {
          claim_id: string
          compensation_amount?: number | null
          compensation_days?: number | null
          compensation_weeks?: number | null
          created_at?: string
          default_side_total?: number | null
          final_rating?: number | null
          id?: string
          left_side_total?: number | null
          right_side_total?: number | null
        }
        Update: {
          claim_id?: string
          compensation_amount?: number | null
          compensation_days?: number | null
          compensation_weeks?: number | null
          created_at?: string
          default_side_total?: number | null
          final_rating?: number | null
          id?: string
          left_side_total?: number | null
          right_side_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wc_report_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "wc_claim"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      view_registered_function: {
        Row: {
          args: Json | null
          class_name: string | null
          description: string | null
          id: string | null
          module_path: string | null
          name: string | null
          return_broker: string | null
          return_brokers: Json | null
          system_functions: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "registered_function_return_broker_fkey"
            columns: ["return_broker"]
            isOneToOne: false
            referencedRelation: "broker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registered_function_return_broker_fkey"
            columns: ["return_broker"]
            isOneToOne: false
            referencedRelation: "view_registered_function_all_rels"
            referencedColumns: ["broker_id"]
          },
        ]
      }
      view_registered_function_all_rels: {
        Row: {
          args: Json | null
          broker_additional_params: Json | null
          broker_custom_source_component: string | null
          broker_data_type: Database["public"]["Enums"]["data_type"] | null
          broker_default_destination:
            | Database["public"]["Enums"]["data_destination"]
            | null
          broker_default_source:
            | Database["public"]["Enums"]["data_source"]
            | null
          broker_description: string | null
          broker_display_name: string | null
          broker_id: string | null
          broker_name: string | null
          broker_other_source_params: Json | null
          broker_output_component:
            | Database["public"]["Enums"]["destination_component"]
            | null
          broker_ready: boolean | null
          broker_sample_entries: string | null
          broker_tags: Json | null
          broker_tooltip: string | null
          broker_validation_rules: Json | null
          broker_value: Json | null
          class_name: string | null
          description: string | null
          id: string | null
          module_path: string | null
          name: string | null
          return_broker: string | null
          system_functions: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_custom_component_fkey"
            columns: ["broker_custom_source_component"]
            isOneToOne: false
            referencedRelation: "data_input_component"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registered_function_return_broker_fkey"
            columns: ["return_broker"]
            isOneToOne: false
            referencedRelation: "broker"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registered_function_return_broker_fkey"
            columns: ["return_broker"]
            isOneToOne: false
            referencedRelation: "view_registered_function_all_rels"
            referencedColumns: ["broker_id"]
          },
        ]
      }
    }
    Functions: {
      add_one_action: {
        Args: {
          p_id: string
          p_name: string
          p_matrix: string
          p_node_type: string
          p_reference_id: string
          p_transformer?: string
        }
        Returns: {
          id: string
          name: string
          matrix: string
          transformer: string
          node_type: string
          reference_id: string
        }[]
      }
      add_one_ai_endpoint: {
        Args: {
          p_id: string
          p_name: string
          p_provider?: string
          p_description?: string
          p_additional_cost?: boolean
          p_cost_details?: Json
          p_params?: Json
        }
        Returns: {
          id: string
          name: string
          provider: string
          description: string
          additional_cost: boolean
          cost_details: Json
          params: Json
        }[]
      }
      add_one_ai_model: {
        Args: {
          p_id: string
          p_name: string
          p_class: string
          p_common_name?: string
          p_provider?: string
          p_endpoints?: Json
          p_context_window?: number
          p_max_tokens?: number
          p_capabilities?: Json
          p_controls?: Json
        }
        Returns: {
          id: string
          name: string
          common_name: string
          class: string
          provider: string
          endpoints: Json
          context_window: number
          max_tokens: number
          capabilities: Json
          controls: Json
        }[]
      }
      add_one_arg: {
        Args: {
          p_id: string
          p_name: string
          p_required?: boolean
          p_default?: string
          p_data_type?: Database["public"]["Enums"]["data_type"]
          p_ready?: boolean
          p_registered_function?: string
        }
        Returns: {
          id: string
          name: string
          required: boolean
          default: string
          data_type: Database["public"]["Enums"]["data_type"]
          ready: boolean
          registered_function: string
        }[]
      }
      add_one_automation_boundary_brokers: {
        Args: {
          p_id: string
          p_matrix?: string
          p_broker?: string
          p_spark_source?: Database["public"]["Enums"]["data_source"]
          p_beacon_destination?: Database["public"]["Enums"]["data_destination"]
        }
        Returns: {
          id: string
          matrix: string
          broker: string
          spark_source: Database["public"]["Enums"]["data_source"]
          beacon_destination: Database["public"]["Enums"]["data_destination"]
        }[]
      }
      add_one_automation_matrix: {
        Args: {
          p_id: string
          p_name: string
          p_description?: string
          p_average_seconds?: number
          p_is_automated?: boolean
          p_cognition_matrices?: Database["public"]["Enums"]["cognition_matrices"]
        }
        Returns: {
          id: string
          name: string
          description: string
          average_seconds: number
          is_automated: boolean
          cognition_matrices: Database["public"]["Enums"]["cognition_matrices"]
        }[]
      }
      add_one_broker: {
        Args: {
          p_id: string
          p_name: string
          p_data_type: Database["public"]["Enums"]["data_type"]
          p_value?: Json
          p_ready?: boolean
          p_default_source?: Database["public"]["Enums"]["data_source"]
          p_display_name?: string
          p_description?: string
          p_tooltip?: string
          p_validation_rules?: Json
          p_sample_entries?: string
          p_custom_source_component?: string
          p_additional_params?: Json
          p_other_source_params?: Json
          p_default_destination?: Database["public"]["Enums"]["data_destination"]
          p_output_component?: Database["public"]["Enums"]["destination_component"]
          p_tags?: Json
        }
        Returns: {
          id: string
          name: string
          value: Json
          data_type: Database["public"]["Enums"]["data_type"]
          ready: boolean
          default_source: Database["public"]["Enums"]["data_source"]
          display_name: string
          description: string
          tooltip: string
          validation_rules: Json
          sample_entries: string
          custom_source_component: string
          additional_params: Json
          other_source_params: Json
          default_destination: Database["public"]["Enums"]["data_destination"]
          output_component: Database["public"]["Enums"]["destination_component"]
          tags: Json
        }[]
      }
      add_one_data_output_component: {
        Args: {
          p_id: string
          p_component_type?: Database["public"]["Enums"]["destination_component"]
          p_ui_component?: string
          p_props?: Json
          p_additional_params?: Json
        }
        Returns: {
          id: string
          component_type: Database["public"]["Enums"]["destination_component"]
          ui_component: string
          props: Json
          additional_params: Json
        }[]
      }
      add_one_display_option: {
        Args: {
          p_id: string
          p_name?: string
          p_default_params?: Json
          p_customizable_params?: Json
          p_additional_params?: Json
        }
        Returns: {
          id: string
          name: string
          default_params: Json
          customizable_params: Json
          additional_params: Json
        }[]
      }
      add_one_entry: {
        Args: {
          p_table_name: string
          p_payload: Json
          p_create_function?: string
        }
        Returns: Json
      }
      add_one_extractor: {
        Args: {
          p_id: string
          p_name: string
          p_output_type?: Database["public"]["Enums"]["data_type"]
          p_default_identifier?: string
          p_default_index?: number
        }
        Returns: {
          id: string
          name: string
          output_type: Database["public"]["Enums"]["data_type"]
          default_identifier: string
          default_index: number
        }[]
      }
      add_one_processors: {
        Args: {
          p_id: string
          p_name: string
          p_depends_default?: string
          p_default_extractors?: Json
          p_params?: Json
        }
        Returns: {
          id: string
          name: string
          depends_default: string
          default_extractors: Json
          params: Json
        }[]
      }
      add_one_public_registered_function: {
        Args: {
          p_id: string
          p_name: string
          p_module_path: string
          p_class_name?: string
          p_description?: string
          p_return_broker?: string
        }
        Returns: {
          id: string
          name: string
          module_path: string
          class_name: string
          description: string
          return_broker: string
        }[]
      }
      add_one_recipe:
        | {
            Args: {
              p_id: string
              p_name: string
              p_status: Database["public"]["Enums"]["recipe_status"]
              p_description?: string
              p_tags?: Json
              p_sample_output?: string
              p_is_public?: boolean
              p_version?: number
              p_messages?: Json[]
              p_post_result_options?: Json
            }
            Returns: {
              id: string
              name: string
              description: string
              tags: Json
              sample_output: string
              is_public: boolean
              status: Database["public"]["Enums"]["recipe_status"]
              version: number
              messages: Json[]
              post_result_options: Json
            }[]
          }
        | {
            Args: {
              p_id: string
              p_name: string
              p_status: Database["public"]["Enums"]["recipe_status"]
              p_varsion: number
              p_description?: string
              p_tags?: Json
              p_sample_output?: string
              p_is_public?: boolean
              p_messages?: Json[]
              p_post_result_options?: Json
            }
            Returns: {
              id: string
              name: string
              description: string
              tags: Json
              sample_output: string
              is_public: boolean
              status: Database["public"]["Enums"]["recipe_status"]
              varsion: number
              messages: Json[]
              post_result_options: Json
            }[]
          }
      add_one_recipe_broker: {
        Args: {
          p_id: string
          p_recipe: string
          p_broker: string
          p_broker_role: Database["public"]["Enums"]["broker_role"]
          p_required?: boolean
        }
        Returns: {
          id: string
          recipe: string
          broker: string
          broker_role: Database["public"]["Enums"]["broker_role"]
          required: boolean
        }[]
      }
      add_one_recipe_display: {
        Args: {
          p_id: string
          p_recipe: string
          p_display: string
          p_priority?: number
          p_display_settings?: Json
        }
        Returns: {
          id: string
          recipe: string
          display: string
          priority: number
          display_settings: Json
        }[]
      }
      add_one_recipe_function: {
        Args: {
          p_id: string
          p_recipe: string
          p_function: string
          p_role: Database["public"]["Enums"]["function_role"]
          p_params?: Json
        }
        Returns: {
          id: string
          recipe: string
          function: string
          role: Database["public"]["Enums"]["function_role"]
          params: Json
        }[]
      }
      add_one_recipe_model: {
        Args: {
          p_id: string
          p_recipe: string
          p_ai_model: string
          p_role: Database["public"]["Enums"]["model_role"]
          p_priority?: number
        }
        Returns: {
          id: string
          recipe: string
          ai_model: string
          role: Database["public"]["Enums"]["model_role"]
          priority: number
        }[]
      }
      add_one_recipe_processors: {
        Args: {
          p_id: string
          p_recipe: string
          p_processor: string
          p_params?: Json
        }
        Returns: {
          id: string
          recipe: string
          processor: string
          params: Json
        }[]
      }
      add_one_recipe_tools: {
        Args: {
          p_id: string
          p_recipe: string
          p_tool: string
          p_params?: Json
        }
        Returns: {
          id: string
          recipe: string
          tool: string
          params: Json
        }[]
      }
      add_one_registered_function:
        | {
            Args: {
              input_json: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_id: string
              p_name: string
              p_module_path: string
              p_class_name?: string
              p_description?: string
              p_return_broker?: string
            }
            Returns: {
              id: string
              name: string
              module_path: string
              class_name: string
              description: string
              return_broker: string
            }[]
          }
        | {
            Args: {
              p_payload: Json
            }
            Returns: Json
          }
      add_one_system_function: {
        Args: {
          p_id: string
          p_public_name: string
          p_rf_id: string
          p_description?: string
          p_sample?: string
          p_input_params?: Json
          p_output_options?: Json
        }
        Returns: {
          id: string
          public_name: string
          description: string
          sample: string
          input_params: Json
          output_options: Json
          rf_id: string
        }[]
      }
      add_one_tool: {
        Args: {
          p_id: string
          p_name: string
          p_source: Json
          p_description?: string
          p_parameters?: Json
          p_required_args?: Json
          p_system_function?: string
          p_additional_params?: Json
        }
        Returns: {
          id: string
          name: string
          source: Json
          description: string
          parameters: Json
          required_args: Json
          system_function: string
          additional_params: Json
        }[]
      }
      add_one_transformers: {
        Args: {
          p_id: string
          p_name?: string
          p_input_params?: Json
          p_ourput_params?: Json
        }
        Returns: {
          id: string
          name: string
          input_params: Json
          ourput_params: Json
        }[]
      }
      cleanup_recipe_message_order: {
        Args: {
          recipe_id_param: string
        }
        Returns: undefined
      }
      convert_db_fields_frontend_registered_function: {
        Args: {
          input_rows: Database["public"]["Tables"]["registered_function"]["Row"][]
        }
        Returns: Json
      }
      convert_db_fields_to_frontend_registered_function:
        | {
            Args: {
              input_json: Json
            }
            Returns: {
              p_id: string
              p_name: string
              p_module_path: string
              p_class_name: string
              p_description: string
              p_return_broker: string
            }[]
          }
        | {
            Args: {
              input_rows: Database["public"]["Tables"]["registered_function"]["Row"][]
            }
            Returns: Json
          }
      convert_frontend_fields_to_db_registered_function: {
        Args: {
          input_json: Json
        }
        Returns: {
          p_id: string
          p_name: string
          p_module_path: string
          p_class_name: string
          p_description: string
          p_return_broker: string
        }[]
      }
      convert_frontend_to_db_fields: {
        Args: {
          input_json: Json
        }
        Returns: {
          p_id: string
          p_name: string
          p_module_path: string
          p_class_name: string
          p_description: string
          p_return_broker: string
        }[]
      }
      convert_frontend_to_db_fields_registered_function: {
        Args: {
          input_json: Json
        }
        Returns: {
          p_id: string
          p_name: string
          p_module_path: string
          p_class_name: string
          p_description: string
          p_return_broker: string
        }[]
      }
      convert_public_registered_function_fields: {
        Args: {
          input_rows: Database["public"]["Tables"]["registered_function"]["Row"][]
        }
        Returns: Json
      }
      convert_registered_function_to_frontend: {
        Args: {
          input_row: unknown
        }
        Returns: Json
      }
      create_arg: {
        Args: {
          p_name: string
          p_required: boolean
          p_default_value: string
          p_data_type: Database["public"]["Enums"]["data_type"]
          p_ready: boolean
          p_registered_function: string
        }
        Returns: string
      }
      create_registered_function: {
        Args: {
          p_name: string
          p_module_path: string
          p_class_name: string
          p_description: string
          p_return_broker: string
        }
        Returns: string
      }
      create_registered_function_with_args: {
        Args: {
          p_name: string
          p_module_path: string
          p_class_name: string
          p_description: string
          p_return_broker: string
          p_args: Json
        }
        Returns: string
      }
      create_related_records: {
        Args: {
          input_data: Json
        }
        Returns: Json
      }
      delete_arg: {
        Args: {
          p_arg_id: string
        }
        Returns: undefined
      }
      delete_by_id: {
        Args: {
          p_table_name: string
          p_ids: string[]
        }
        Returns: Json
      }
      delete_registered_function: {
        Args: {
          p_function_id: string
        }
        Returns: undefined
      }
      delete_unused_message_templates: {
        Args: Record<PropertyKey, never>
        Returns: {
          deleted_count: number
          deleted_templates: Database["public"]["Tables"]["message_template"]["Row"][]
        }[]
      }
      dynamic_search: {
        Args: {
          p_table_name: string
          p_search_field: string
          p_search_value: string
          p_page_number?: number
          p_page_size?: number
        }
        Returns: {
          result: Json
          total_count: number
        }[]
      }
      execute_complex_save: {
        Args: {
          operations: Json
          options?: Json
        }
        Returns: Json
      }
      execute_safe_query: {
        Args: {
          query: string
        }
        Returns: Json
      }
      fetch_all_action: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          matrix: string
          transformer: string
          node_type: string
          reference_id: string
        }[]
      }
      fetch_all_ai_endpoint: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          provider: string
          description: string
          additional_cost: boolean
          cost_details: Json
          params: Json
        }[]
      }
      fetch_all_ai_model: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          common_name: string
          class: string
          provider: string
          endpoints: Json
          context_window: number
          max_tokens: number
          capabilities: Json
          controls: Json
        }[]
      }
      fetch_all_arg: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          required: boolean
          default: string
          data_type: Database["public"]["Enums"]["data_type"]
          ready: boolean
          registered_function: string
        }[]
      }
      fetch_all_automation_boundary_brokers: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          matrix: string
          broker: string
          spark_source: Database["public"]["Enums"]["data_source"]
          beacon_destination: Database["public"]["Enums"]["data_destination"]
        }[]
      }
      fetch_all_automation_matrix: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          description: string
          average_seconds: number
          is_automated: boolean
          cognition_matrices: Database["public"]["Enums"]["cognition_matrices"]
        }[]
      }
      fetch_all_broker: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          value: Json
          data_type: Database["public"]["Enums"]["data_type"]
          ready: boolean
          default_source: Database["public"]["Enums"]["data_source"]
          display_name: string
          description: string
          tooltip: string
          validation_rules: Json
          sample_entries: string
          custom_source_component: string
          additional_params: Json
          other_source_params: Json
          default_destination: Database["public"]["Enums"]["data_destination"]
          output_component: Database["public"]["Enums"]["destination_component"]
          tags: Json
        }[]
      }
      fetch_all_data_output_component: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          component_type: Database["public"]["Enums"]["destination_component"]
          ui_component: string
          props: Json
          additional_params: Json
        }[]
      }
      fetch_all_display_option: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          default_params: Json
          customizable_params: Json
          additional_params: Json
        }[]
      }
      fetch_all_extractor: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          output_type: Database["public"]["Enums"]["data_type"]
          default_identifier: string
          default_index: number
        }[]
      }
      fetch_all_fk_ifk: {
        Args: {
          p_table_name: string
          p_primary_key_values: Json
        }
        Returns: Json
      }
      fetch_all_fk_ifk_direct: {
        Args: {
          p_table_name: string
          p_primary_key_values: Json
        }
        Returns: Json
      }
      fetch_all_fk_ifk_with_list: {
        Args: {
          p_table_name: string
          p_id: string
        }
        Returns: Json
      }
      fetch_all_id_name_arg: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
        }[]
      }
      fetch_all_id_name_broker: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
        }[]
      }
      fetch_all_id_name_registered_function: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
        }[]
      }
      fetch_all_processors: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          depends_default: string
          default_extractors: Json
          params: Json
        }[]
      }
      fetch_all_recipe: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          description: string
          tags: Json
          sample_output: string
          is_public: boolean
          status: Database["public"]["Enums"]["recipe_status"]
          version: number
          messages: Json[]
          post_result_options: Json
        }[]
      }
      fetch_all_recipe_broker: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          recipe: string
          broker: string
          broker_role: Database["public"]["Enums"]["broker_role"]
          required: boolean
        }[]
      }
      fetch_all_recipe_display: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          recipe: string
          display: string
          priority: number
          display_settings: Json
        }[]
      }
      fetch_all_recipe_function: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          recipe: string
          function: string
          role: Database["public"]["Enums"]["function_role"]
          params: Json
        }[]
      }
      fetch_all_recipe_model: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          recipe: string
          ai_model: string
          role: Database["public"]["Enums"]["model_role"]
          priority: number
        }[]
      }
      fetch_all_recipe_processors: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          recipe: string
          processor: string
          params: Json
        }[]
      }
      fetch_all_recipe_tools: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          recipe: string
          tool: string
          params: Json
        }[]
      }
      fetch_all_registered_function: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          module_path: string
          class_name: string
          description: string
          return_broker: string
        }[]
      }
      fetch_all_registered_function_formatted: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fetch_all_registered_functions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fetch_all_system_function: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          public_name: string
          description: string
          sample: string
          input_params: Json
          output_options: Json
          rf_id: string
        }[]
      }
      fetch_all_tool: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          source: Json
          description: string
          parameters: Json
          required_args: Json
          system_function: string
          additional_params: Json
        }[]
      }
      fetch_all_transformers: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          input_params: Json
          ourput_params: Json
        }[]
      }
      fetch_all_with_children: {
        Args: {
          p_table_name: string
        }
        Returns: Json
      }
      fetch_by_id_action: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          name: string
          matrix: string
          transformer: string
          node_type: string
          reference_id: string
        }[]
      }
      fetch_by_id_ai_endpoint: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          name: string
          provider: string
          description: string
          additional_cost: boolean
          cost_details: Json
          params: Json
        }[]
      }
      fetch_by_id_ai_model: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          name: string
          common_name: string
          class: string
          provider: string
          endpoints: Json
          context_window: number
          max_tokens: number
          capabilities: Json
          controls: Json
        }[]
      }
      fetch_by_id_arg: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          name: string
          required: boolean
          default: string
          data_type: Database["public"]["Enums"]["data_type"]
          ready: boolean
          registered_function: string
        }[]
      }
      fetch_by_id_automation_boundary_brokers: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          matrix: string
          broker: string
          spark_source: Database["public"]["Enums"]["data_source"]
          beacon_destination: Database["public"]["Enums"]["data_destination"]
        }[]
      }
      fetch_by_id_automation_matrix: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          name: string
          description: string
          average_seconds: number
          is_automated: boolean
          cognition_matrices: Database["public"]["Enums"]["cognition_matrices"]
        }[]
      }
      fetch_by_id_broker: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          name: string
          value: Json
          data_type: Database["public"]["Enums"]["data_type"]
          ready: boolean
          default_source: Database["public"]["Enums"]["data_source"]
          display_name: string
          description: string
          tooltip: string
          validation_rules: Json
          sample_entries: string
          custom_source_component: string
          additional_params: Json
          other_source_params: Json
          default_destination: Database["public"]["Enums"]["data_destination"]
          output_component: Database["public"]["Enums"]["destination_component"]
          tags: Json
        }[]
      }
      fetch_by_id_broker_simple: {
        Args: {
          p_record_id: string
        }
        Returns: {
          id: string
        }[]
      }
      fetch_by_id_data_output_component: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          component_type: Database["public"]["Enums"]["destination_component"]
          ui_component: string
          props: Json
          additional_params: Json
        }[]
      }
      fetch_by_id_display_option: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          name: string
          default_params: Json
          customizable_params: Json
          additional_params: Json
        }[]
      }
      fetch_by_id_extractor: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          name: string
          output_type: Database["public"]["Enums"]["data_type"]
          default_identifier: string
          default_index: number
        }[]
      }
      fetch_by_id_fe_registered_function: {
        Args: {
          record_id: string
        }
        Returns: Json
      }
      fetch_by_id_processors: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          name: string
          depends_default: string
          default_extractors: Json
          params: Json
        }[]
      }
      fetch_by_id_recipe: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          name: string
          description: string
          tags: Json
          sample_output: string
          is_public: boolean
          status: Database["public"]["Enums"]["recipe_status"]
          version: number
          messages: Json[]
          post_result_options: Json
        }[]
      }
      fetch_by_id_recipe_broker: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          recipe: string
          broker: string
          broker_role: Database["public"]["Enums"]["broker_role"]
          required: boolean
        }[]
      }
      fetch_by_id_recipe_display: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          recipe: string
          display: string
          priority: number
          display_settings: Json
        }[]
      }
      fetch_by_id_recipe_function: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          recipe: string
          function: string
          role: Database["public"]["Enums"]["function_role"]
          params: Json
        }[]
      }
      fetch_by_id_recipe_model: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          recipe: string
          ai_model: string
          role: Database["public"]["Enums"]["model_role"]
          priority: number
        }[]
      }
      fetch_by_id_recipe_processors: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          recipe: string
          processor: string
          params: Json
        }[]
      }
      fetch_by_id_recipe_tools: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          recipe: string
          tool: string
          params: Json
        }[]
      }
      fetch_by_id_registered_function: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          name: string
          module_path: string
          class_name: string
          description: string
          return_broker: string
        }[]
      }
      fetch_by_id_registered_function_formatted: {
        Args: {
          record_id: string
        }
        Returns: Json
      }
      fetch_by_id_system_function: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          public_name: string
          description: string
          sample: string
          input_params: Json
          output_options: Json
          rf_id: string
        }[]
      }
      fetch_by_id_tool: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          name: string
          source: Json
          description: string
          parameters: Json
          required_args: Json
          system_function: string
          additional_params: Json
        }[]
      }
      fetch_by_id_transformers: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          name: string
          input_params: Json
          ourput_params: Json
        }[]
      }
      fetch_custom_rels: {
        Args: {
          p_table_name: string
          p_id: string
          p_table_list: string[]
        }
        Returns: Json
      }
      fetch_emails: {
        Args: Record<PropertyKey, never>
        Returns: {
          body: string
          id: string
          is_read: boolean | null
          recipient: string
          sender: string
          subject: string
          timestamp: string | null
        }[]
      }
      fetch_filtered: {
        Args: {
          p_table_name: string
          p_filters: Json
        }
        Returns: Json
      }
      fetch_filtered_with_fk_ifk:
        | {
            Args: {
              p_table_name: string
              p_filters: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_table_name: string
              p_filters: Json
              p_include_fk?: boolean
              p_include_ifk?: boolean
            }
            Returns: Json
          }
      fetch_foreign_key_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          source_table: string
          source_column: string
          target_table: string
          target_column: string
          target_data: Json
        }[]
      }
      fetch_id_name_arg: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
        }[]
      }
      fetch_id_name_public_registered_function: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
        }[]
      }
      fetch_id_name_registered_function: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
        }[]
      }
      fetch_paginated: {
        Args: {
          p_table_name: string
          p_page: number
          p_page_size: number
        }
        Returns: Json[]
      }
      fetch_paginated_registered_functions: {
        Args: {
          page: number
          count: number
        }
        Returns: Json
      }
      fetch_paginated_with_all_ids: {
        Args: {
          p_table_name: string
          p_page: number
          p_page_size: number
          p_include_all_ids?: boolean
          p_conversion_function?: string
        }
        Returns: Json
      }
      fetch_paginated_with_ids_names: {
        Args: {
          p_table_name: string
          p_page: number
          p_page_size: number
          p_include_all_ids?: boolean
          p_conversion_function?: string
        }
        Returns: Json
      }
      fetch_with_all_fk_and_ifk_children: {
        Args: {
          p_table_name: string
          p_id: string
        }
        Returns: Json
      }
      fetch_with_children: {
        Args: {
          p_table_name: string
          p_id: string
        }
        Returns: Json
      }
      fetch_with_children_and_parents_new: {
        Args: {
          p_table_name: string
          p_id: string
        }
        Returns: Json
      }
      fetch_with_children_new: {
        Args: {
          p_table_name: string
          p_id: string
        }
        Returns: Json
      }
      fetch_with_fk: {
        Args: {
          p_table_name: string
          p_id: string
        }
        Returns: Json
      }
      fetch_with_ifk: {
        Args: {
          p_table_name: string
          p_id: string
        }
        Returns: Json
      }
      find_fk_entries: {
        Args: {
          p_table_name: string
          p_id: string
        }
        Returns: {
          fk_column_name: string
          referenced_table_name: string
          referenced_column_name: string
          referenced_entry: Json
        }[]
      }
      find_ifk_entries: {
        Args: {
          p_table_name: string
          p_id: string
          p_limit?: number
        }
        Returns: {
          related_table_name: string
          related_column_name: string
          related_entry: Json
        }[]
      }
      get_arg_by_id: {
        Args: {
          p_arg_id: string
        }
        Returns: {
          id: string
          name: string
          required: boolean
          default_value: string
          data_type: Database["public"]["Enums"]["data_type"]
          ready: boolean
          registered_function: string
        }[]
      }
      get_args_for_function: {
        Args: {
          p_function_id: string
        }
        Returns: {
          id: string
          name: string
          required: boolean
          default_value: string
          data_type: Database["public"]["Enums"]["data_type"]
          ready: boolean
        }[]
      }
      get_database_functions: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          schema: string
          security_type: string
          arguments: string
          returns: string
          definition: string
        }[]
      }
      get_database_permissions: {
        Args: Record<PropertyKey, never>
        Returns: {
          object_name: string
          object_type: string
          role: string
          privileges: string[]
        }[]
      }
      get_database_schema_json: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_inverse_fk_relationships: {
        Args: {
          p_table_name: string
        }
        Returns: {
          referencing_table_name: string
          referencing_column_name: string
          referenced_column_name: string
        }[]
      }
      get_recipe_messages: {
        Args: {
          recipe_uuid: string
        }
        Returns: {
          message_id: string
          message_order: number
        }[]
      }
      get_registered_function_with_args: {
        Args: {
          p_function_id: string
        }
        Returns: {
          function_id: string
          function_name: string
          module_path: string
          class_name: string
          description: string
          return_broker: string
          args: Json
        }[]
      }
      get_schema: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_storage_object: {
        Args: {
          p_bucket_id: string
          p_name: string
        }
        Returns: Json
      }
      get_table_info: {
        Args: {
          table_name: string
        }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: string
          foreign_table: string
          foreign_column: string
        }[]
      }
      get_tables_and_columns: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          column_name: string
          data_type: string
        }[]
      }
      get_unused_message_templates: {
        Args: Record<PropertyKey, never>
        Returns: {
          content: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["message_role"]
          type: Database["public"]["Enums"]["message_type"]
        }[]
      }
      mark_email_as_read: {
        Args: {
          _id: string
        }
        Returns: {
          body: string
          id: string
          is_read: boolean | null
          recipient: string
          sender: string
          subject: string
          timestamp: string | null
        }
      }
      rename_storage_folder: {
        Args: {
          bucket_name: string
          old_folder_path: string
          new_folder_path: string
          auth_user_id?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      send_email: {
        Args: {
          _sender: string
          _recipient: string
          _subject: string
          _body: string
        }
        Returns: {
          body: string
          id: string
          is_read: boolean | null
          recipient: string
          sender: string
          subject: string
          timestamp: string | null
        }
      }
      update_all_bucket_tree_structures: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_arg: {
        Args: {
          p_arg_id: string
          p_name: string
          p_required: boolean
          p_default_value: string
          p_data_type: Database["public"]["Enums"]["data_type"]
          p_ready: boolean
          p_registered_function: string
        }
        Returns: undefined
      }
      update_bucket_structure: {
        Args: {
          bucket_name: string
        }
        Returns: Json
      }
      update_bucket_tree_structure: {
        Args: {
          bucket_name: string
        }
        Returns: Json
      }
      update_by_id: {
        Args: {
          p_table_name: string
          p_payload: Json
          p_update_function?: string
        }
        Returns: Json
      }
      update_one: {
        Args: {
          p_table_name: string
          p_id: string
          p_data: Json
        }
        Returns: undefined
      }
      update_registered_function:
        | {
            Args: {
              p_function_id: string
              p_name: string
              p_module_path: string
              p_class_name: string
              p_description: string
              p_return_broker: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_payload: Json
            }
            Returns: Json
          }
      update_registered_function_with_args: {
        Args: {
          p_function_id: string
          p_name: string
          p_module_path: string
          p_class_name: string
          p_description: string
          p_return_broker: string
          p_args: Json
        }
        Returns: undefined
      }
      upsert_action: {
        Args: {
          p_id: string
          p_name: string
          p_matrix: string
          p_node_type: string
          p_reference_id: string
          p_transformer?: string
        }
        Returns: undefined
      }
      upsert_ai_endpoint: {
        Args: {
          p_id: string
          p_name: string
          p_provider?: string
          p_description?: string
          p_additional_cost?: boolean
          p_cost_details?: Json
          p_params?: Json
        }
        Returns: undefined
      }
      upsert_ai_model: {
        Args: {
          p_id: string
          p_name: string
          p_class: string
          p_common_name?: string
          p_provider?: string
          p_endpoints?: Json
          p_context_window?: number
          p_max_tokens?: number
          p_capabilities?: Json
          p_controls?: Json
        }
        Returns: undefined
      }
      upsert_arg: {
        Args: {
          p_id: string
          p_name: string
          p_required?: boolean
          p_default?: string
          p_data_type?: Database["public"]["Enums"]["data_type"]
          p_ready?: boolean
          p_registered_function?: string
        }
        Returns: undefined
      }
      upsert_automation_boundary_brokers: {
        Args: {
          p_id: string
          p_matrix?: string
          p_broker?: string
          p_spark_source?: Database["public"]["Enums"]["data_source"]
          p_beacon_destination?: Database["public"]["Enums"]["data_destination"]
        }
        Returns: undefined
      }
      upsert_automation_matrix: {
        Args: {
          p_id: string
          p_name: string
          p_description?: string
          p_average_seconds?: number
          p_is_automated?: boolean
          p_cognition_matrices?: Database["public"]["Enums"]["cognition_matrices"]
        }
        Returns: undefined
      }
      upsert_broker: {
        Args: {
          p_id: string
          p_name: string
          p_data_type: Database["public"]["Enums"]["data_type"]
          p_value?: Json
          p_ready?: boolean
          p_default_source?: Database["public"]["Enums"]["data_source"]
          p_display_name?: string
          p_description?: string
          p_tooltip?: string
          p_validation_rules?: Json
          p_sample_entries?: string
          p_custom_source_component?: string
          p_additional_params?: Json
          p_other_source_params?: Json
          p_default_destination?: Database["public"]["Enums"]["data_destination"]
          p_output_component?: Database["public"]["Enums"]["destination_component"]
          p_tags?: Json
        }
        Returns: undefined
      }
      upsert_data_output_component: {
        Args: {
          p_id: string
          p_component_type?: Database["public"]["Enums"]["destination_component"]
          p_ui_component?: string
          p_props?: Json
          p_additional_params?: Json
        }
        Returns: undefined
      }
      upsert_display_option: {
        Args: {
          p_id: string
          p_name?: string
          p_default_params?: Json
          p_customizable_params?: Json
          p_additional_params?: Json
        }
        Returns: undefined
      }
      upsert_extractor: {
        Args: {
          p_id: string
          p_name: string
          p_output_type?: Database["public"]["Enums"]["data_type"]
          p_default_identifier?: string
          p_default_index?: number
        }
        Returns: undefined
      }
      upsert_processors: {
        Args: {
          p_id: string
          p_name: string
          p_depends_default?: string
          p_default_extractors?: Json
          p_params?: Json
        }
        Returns: undefined
      }
      upsert_recipe:
        | {
            Args: {
              p_id: string
              p_name: string
              p_status: Database["public"]["Enums"]["recipe_status"]
              p_description?: string
              p_tags?: Json
              p_sample_output?: string
              p_is_public?: boolean
              p_version?: number
              p_messages?: Json[]
              p_post_result_options?: Json
            }
            Returns: undefined
          }
        | {
            Args: {
              p_id: string
              p_name: string
              p_status: Database["public"]["Enums"]["recipe_status"]
              p_varsion: number
              p_description?: string
              p_tags?: Json
              p_sample_output?: string
              p_is_public?: boolean
              p_messages?: Json[]
              p_post_result_options?: Json
            }
            Returns: undefined
          }
      upsert_recipe_broker: {
        Args: {
          p_id: string
          p_recipe: string
          p_broker: string
          p_broker_role: Database["public"]["Enums"]["broker_role"]
          p_required?: boolean
        }
        Returns: undefined
      }
      upsert_recipe_display: {
        Args: {
          p_id: string
          p_recipe: string
          p_display: string
          p_priority?: number
          p_display_settings?: Json
        }
        Returns: undefined
      }
      upsert_recipe_function: {
        Args: {
          p_id: string
          p_recipe: string
          p_function: string
          p_role: Database["public"]["Enums"]["function_role"]
          p_params?: Json
        }
        Returns: undefined
      }
      upsert_recipe_model: {
        Args: {
          p_id: string
          p_recipe: string
          p_ai_model: string
          p_role: Database["public"]["Enums"]["model_role"]
          p_priority?: number
        }
        Returns: undefined
      }
      upsert_recipe_processors: {
        Args: {
          p_id: string
          p_recipe: string
          p_processor: string
          p_params?: Json
        }
        Returns: undefined
      }
      upsert_recipe_tools: {
        Args: {
          p_id: string
          p_recipe: string
          p_tool: string
          p_params?: Json
        }
        Returns: undefined
      }
      upsert_registered_function:
        | {
            Args: {
              input_json: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_id: string
              p_name: string
              p_module_path: string
              p_class_name?: string
              p_description?: string
              p_return_broker?: string
            }
            Returns: undefined
          }
      upsert_system_function: {
        Args: {
          p_id: string
          p_public_name: string
          p_rf_id: string
          p_description?: string
          p_sample?: string
          p_input_params?: Json
          p_output_options?: Json
        }
        Returns: undefined
      }
      upsert_tool: {
        Args: {
          p_id: string
          p_name: string
          p_source: Json
          p_description?: string
          p_parameters?: Json
          p_required_args?: Json
          p_system_function?: string
          p_additional_params?: Json
        }
        Returns: undefined
      }
      upsert_transformers: {
        Args: {
          p_id: string
          p_name?: string
          p_input_params?: Json
          p_ourput_params?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      app_type: "recipe" | "workflow" | "other"
      broker_role: "input_broker" | "output_broker"
      cognition_matrices:
        | "agent_crew"
        | "agent_mixture"
        | "workflow"
        | "conductor"
        | "monte_carlo"
        | "hypercluster"
        | "the_matrix"
        | "knowledge_matrix"
      color:
        | "slate"
        | "gray"
        | "zinc"
        | "neutral"
        | "stone"
        | "red"
        | "orange"
        | "amber"
        | "yellow"
        | "lime"
        | "green"
        | "emerald"
        | "teal"
        | "cyan"
        | "sky"
        | "blue"
        | "indigo"
        | "violet"
        | "purple"
        | "fuchsia"
        | "pink"
        | "rose"
      data_destination:
        | "user_output"
        | "database"
        | "file"
        | "api_response"
        | "function"
      data_source:
        | "user_input"
        | "database"
        | "api"
        | "environment"
        | "file"
        | "chance"
        | "generated_data"
        | "function"
        | "none"
      data_type: "str" | "int" | "float" | "bool" | "dict" | "list" | "url"
      default_component:
        | "Input"
        | "Textarea"
        | "Switch"
        | "Select"
        | "Slider"
        | "UUID_Field"
        | "UUID_Array"
        | "Button"
        | "Checkbox"
        | "Chip"
        | "Color_Picker"
        | "Date_Picker"
        | "Drawer"
        | "Menu"
        | "File_Upload"
        | "Image_Display"
        | "Json_Editor"
        | "Number_Input"
        | "Phone_Input"
        | "Radio_Group"
        | "Relational_Input"
        | "Relational_Button"
        | "Search_Input"
        | "Sheet"
        | "Star_Rating"
        | "Time_Picker"
        | "Accordion_View"
        | "Accordion_View_Add_Edit"
        | "Accordion_Selected"
        | "BrokerInput"
        | "BrokerTextarea"
        | "BrokerSelect"
        | "BrokerSlider"
        | "BrokerSwitch"
        | "BrokerCheckbox"
        | "BrokerRadio"
        | "BrokerTextareaGrow"
        | "BrokerTailwindColorPicker"
        | "BrokerColorPicker"
        | "BrokerTextArrayInput"
        | "BrokerNumberPicker"
        | "BrokerNumberInput"
        | "BrokerCustomSelect"
        | "BrokerCustomInput"
        | "BrokerRadioGroup"
      destination_component:
        | "chatResponse"
        | "PlainText"
        | "Textarea"
        | "JsonViewer"
        | "CodeView"
        | "MarkdownViewer"
        | "RichTextEditor"
        | "TreeView"
        | "ImageView"
        | "AudioOutput"
        | "Presentation"
        | "RunCodeFront"
        | "RunCodeBack"
        | "ComplexMulti"
        | "FileOutput"
        | "Table"
        | "Form"
        | "VerticalList"
        | "HorizontalList"
        | "Flowchart"
        | "WordMap"
        | "GeographicMap"
        | "video"
        | "Spreadsheet"
        | "Timeline"
        | "GanttChart"
        | "NetworkGraph"
        | "Heatmap"
        | "3DModelViewer"
        | "LaTeXRenderer"
        | "DiffViewer"
        | "Checklist"
        | "KanbanBoard"
        | "PivotTable"
        | "InteractiveChart"
        | "SankeyDiagram"
        | "MindMap"
        | "Calendar"
        | "Carousel"
        | "PDFViewer"
        | "SVGEditor"
        | "DataFlowDiagram"
        | "UMLDiagram"
        | "GlossaryView"
        | "DecisionTree"
        | "WordHighlighter"
        | "SpectrumAnalyzer"
        | "LiveTraffic"
        | "WeatherMap"
        | "WeatherDashboard"
        | "Thermometer"
        | "SatelliteView"
        | "PublicLiveCam"
        | "Clock"
        | "BudgetVisualizer"
        | "MealPlanner"
        | "TaskPrioritization"
        | "VoiceSentimentAnalysis"
        | "NewsAggregator"
        | "FitnessTracker"
        | "TravelPlanner"
        | "BucketList"
        | "SocialMediaInfo"
        | "LocalEvents"
        | "NeedNewOption"
        | "none"
      function_role:
        | "decision"
        | "validation"
        | "post_processing"
        | "pre-Processing"
        | "rating"
        | "comparison"
        | "save_data"
        | "other"
      matrix_pathway:
        | "agent_crew"
        | "agent_mixture"
        | "workflow"
        | "conductor"
        | "monte_carlo"
        | "hypercluster"
        | "the_matrix"
        | "knowledge_matrix"
      message_role: "user" | "system" | "assistant"
      message_type:
        | "text"
        | "image_url"
        | "blob"
        | "base64_image"
        | "other"
        | "tool_result"
        | "json_object"
        | "mixed"
      model_role: "primary_model" | "verified_model" | "trial_model"
      operation_type: "insert" | "update" | "delete"
      orientation: "vertical" | "horizontal" | "default"
      recipe_status:
        | "live"
        | "draft"
        | "in_review"
        | "active_testing"
        | "archived"
        | "other"
      size:
        | "3xs"
        | "2xs"
        | "xs"
        | "s"
        | "m"
        | "l"
        | "xl"
        | "2xl"
        | "3xl"
        | "4xl"
        | "5xl"
        | "default"
      source_component:
        | "Input"
        | "NumberInput"
        | "Textarea"
        | "Slider"
        | "YesNo"
        | "Checkbox"
        | "Switch"
        | "Select"
        | "Json"
        | "FileUpload"
        | "Image"
        | "UrlLink"
        | "none"
      wc_finger_type: "index" | "middle" | "ring" | "little" | "thumb"
      wc_side: "right" | "left" | "default"
    }
    CompositeTypes: {
      operation_record: {
        table_name: string | null
        operation: Database["public"]["Enums"]["operation_type"] | null
        data: Json | null
        dependencies: string[] | null
      }
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
