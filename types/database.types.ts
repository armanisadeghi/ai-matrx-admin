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
      ai_models: {
        Row: {
          capabilities: string[] | null
          class: string | null
          common_name: string | null
          context_window: number | null
          controls: number[] | null
          created_at: string
          endpoints: number[] | null
          id: number
          max_tokens: number | null
          model: string | null
          provider: number | null
        }
        Insert: {
          capabilities?: string[] | null
          class?: string | null
          common_name?: string | null
          context_window?: number | null
          controls?: number[] | null
          created_at?: string
          endpoints?: number[] | null
          id?: number
          max_tokens?: number | null
          model?: string | null
          provider?: number | null
        }
        Update: {
          capabilities?: string[] | null
          class?: string | null
          common_name?: string | null
          context_window?: number | null
          controls?: number[] | null
          created_at?: string
          endpoints?: number[] | null
          id?: number
          max_tokens?: number | null
          model?: string | null
          provider?: number | null
        }
        Relationships: []
      }
      args: {
        Row: {
          common_name: string | null
          data_type: Database["public"]["Enums"]["data_type"] | null
          default: string | null
          function: number | null
          id: number
          is_ready: boolean | null
          last_update: string
          name: string | null
          required: boolean | null
        }
        Insert: {
          common_name?: string | null
          data_type?: Database["public"]["Enums"]["data_type"] | null
          default?: string | null
          function?: number | null
          id?: number
          is_ready?: boolean | null
          last_update?: string
          name?: string | null
          required?: boolean | null
        }
        Update: {
          common_name?: string | null
          data_type?: Database["public"]["Enums"]["data_type"] | null
          default?: string | null
          function?: number | null
          id?: number
          is_ready?: boolean | null
          last_update?: string
          name?: string | null
          required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "args_function_fkey"
            columns: ["function"]
            isOneToOne: false
            referencedRelation: "registered_functions"
            referencedColumns: ["id"]
          },
        ]
      }
      broker: {
        Row: {
          additional_params: Json | null
          component: number | null
          component_type: string | null
          data_type: string
          default_source: Database["public"]["Enums"]["default_source"] | null
          default_value: string | null
          description: string | null
          display_name: string
          id: string
          matrix_id: string | null
          official_name: string | null
          other_source_params: Json | null
          ready: boolean | null
          sample_entries: string | null
          tooltip: string | null
          uid: string | null
          user_id: string | null
          validation_rules: Json | null
        }
        Insert: {
          additional_params?: Json | null
          component?: number | null
          component_type?: string | null
          data_type?: string
          default_source?: Database["public"]["Enums"]["default_source"] | null
          default_value?: string | null
          description?: string | null
          display_name: string
          id: string
          matrix_id?: string | null
          official_name?: string | null
          other_source_params?: Json | null
          ready?: boolean | null
          sample_entries?: string | null
          tooltip?: string | null
          uid?: string | null
          user_id?: string | null
          validation_rules?: Json | null
        }
        Update: {
          additional_params?: Json | null
          component?: number | null
          component_type?: string | null
          data_type?: string
          default_source?: Database["public"]["Enums"]["default_source"] | null
          default_value?: string | null
          description?: string | null
          display_name?: string
          id?: string
          matrix_id?: string | null
          official_name?: string | null
          other_source_params?: Json | null
          ready?: boolean | null
          sample_entries?: string | null
          tooltip?: string | null
          uid?: string | null
          user_id?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_component_fkey"
            columns: ["component"]
            isOneToOne: false
            referencedRelation: "broker_component_params"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_matrix_id_fkey"
            columns: ["matrix_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["matrix_id"]
          },
        ]
      }
      broker_component_params: {
        Row: {
          acceptable_filetypes: Json | null
          additional_params: Json | null
          id: number
          include_other: boolean | null
          max: number | null
          min: number | null
          options: Json | null
          rows: number | null
          src: string | null
          step: number | null
          type: Database["public"]["Enums"]["component_type"]
        }
        Insert: {
          acceptable_filetypes?: Json | null
          additional_params?: Json | null
          id?: number
          include_other?: boolean | null
          max?: number | null
          min?: number | null
          options?: Json | null
          rows?: number | null
          src?: string | null
          step?: number | null
          type: Database["public"]["Enums"]["component_type"]
        }
        Update: {
          acceptable_filetypes?: Json | null
          additional_params?: Json | null
          id?: number
          include_other?: boolean | null
          max?: number | null
          min?: number | null
          options?: Json | null
          rows?: number | null
          src?: string | null
          step?: number | null
          type?: Database["public"]["Enums"]["component_type"]
        }
        Relationships: []
      }
      category: {
        Row: {
          created_at: string
          editable: boolean
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          editable?: boolean
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          editable?: boolean
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      chats: {
        Row: {
          chat_id: string
          chat_title: string
          created_at: string
          last_edited: string
          matrix_id: string
          metadata: Json | null
        }
        Insert: {
          chat_id?: string
          chat_title: string
          created_at?: string
          last_edited: string
          matrix_id?: string
          metadata?: Json | null
        }
        Update: {
          chat_id?: string
          chat_title?: string
          created_at?: string
          last_edited?: string
          matrix_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["matrix_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["matrix_id"]
          },
        ]
      }
      chats_copy: {
        Row: {
          chat_id: string | null
          chat_title: string | null
          created_at: string | null
          last_edited: string | null
          matrix_id: string | null
          metadata: Json | null
        }
        Insert: {
          chat_id?: string | null
          chat_title?: string | null
          created_at?: string | null
          last_edited?: string | null
          matrix_id?: string | null
          metadata?: Json | null
        }
        Update: {
          chat_id?: string | null
          chat_title?: string | null
          created_at?: string | null
          last_edited?: string | null
          matrix_id?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      component: {
        Row: {
          id: string
          type: string | null
        }
        Insert: {
          id?: string
          type?: string | null
        }
        Update: {
          id?: string
          type?: string | null
        }
        Relationships: []
      }
      enpoints: {
        Row: {
          additional_cost: boolean | null
          cost_details: string | null
          created_at: string
          description: string | null
          id: number
          name: string | null
          params: Json | null
          provider: string | null
        }
        Insert: {
          additional_cost?: boolean | null
          cost_details?: string | null
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
          params?: Json | null
          provider?: string | null
        }
        Update: {
          additional_cost?: boolean | null
          cost_details?: string | null
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
          params?: Json | null
          provider?: string | null
        }
        Relationships: []
      }
      extractor: {
        Row: {
          default_broker: string | null
          default_identifier: string | null
          default_index: number | null
          id: number
          name: string
          output_type: Database["public"]["Enums"]["data_type"] | null
        }
        Insert: {
          default_broker?: string | null
          default_identifier?: string | null
          default_index?: number | null
          id?: number
          name: string
          output_type?: Database["public"]["Enums"]["data_type"] | null
        }
        Update: {
          default_broker?: string | null
          default_identifier?: string | null
          default_index?: number | null
          id?: number
          name?: string
          output_type?: Database["public"]["Enums"]["data_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "extractor_default_broker_fkey"
            columns: ["default_broker"]
            isOneToOne: false
            referencedRelation: "broker"
            referencedColumns: ["id"]
          },
        ]
      }
      file_sharing: {
        Row: {
          is_public: boolean | null
          object_id: string
          share_with_all: boolean | null
          shared_with_users: string[] | null
        }
        Insert: {
          is_public?: boolean | null
          object_id: string
          share_with_all?: boolean | null
          shared_with_users?: string[] | null
        }
        Update: {
          is_public?: boolean | null
          object_id?: string
          share_with_all?: boolean | null
          shared_with_users?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "file_sharing_settings_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: true
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
      func_returns: {
        Row: {
          common_name: string | null
          data_type: Database["public"]["Enums"]["data_type"] | null
          function: number | null
          id: number
          last_update: string
        }
        Insert: {
          common_name?: string | null
          data_type?: Database["public"]["Enums"]["data_type"] | null
          function?: number | null
          id?: number
          last_update?: string
        }
        Update: {
          common_name?: string | null
          data_type?: Database["public"]["Enums"]["data_type"] | null
          function?: number | null
          id?: number
          last_update?: string
        }
        Relationships: [
          {
            foreignKeyName: "func_returns_function_fkey"
            columns: ["function"]
            isOneToOne: false
            referencedRelation: "registered_functions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string | null
          created_at: string
          id: string
          index: number | null
          role: string | null
          text: string | null
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          id?: string
          index?: number | null
          role?: string | null
          text?: string | null
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          id?: string
          index?: number | null
          role?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["chat_id"]
          },
        ]
      }
      official_recipe_tags: {
        Row: {
          id: number
          tag: string
        }
        Insert: {
          id?: number
          tag: string
        }
        Update: {
          id?: number
          tag?: string
        }
        Relationships: []
      }
      organization: {
        Row: {
          created_at: string
          name: string | null
          org_id: string
          permissions: Json | null
          type: string | null
        }
        Insert: {
          created_at?: string
          name?: string | null
          org_id?: string
          permissions?: Json | null
          type?: string | null
        }
        Update: {
          created_at?: string
          name?: string | null
          org_id?: string
          permissions?: Json | null
          type?: string | null
        }
        Relationships: []
      }
      processors: {
        Row: {
          default_extractors: Json[] | null
          depends_default: number | null
          id: number
          name: string
          params: Json | null
        }
        Insert: {
          default_extractors?: Json[] | null
          depends_default?: number | null
          id?: number
          name: string
          params?: Json | null
        }
        Update: {
          default_extractors?: Json[] | null
          depends_default?: number | null
          id?: number
          name?: string
          params?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "processors_depends_default_fkey"
            columns: ["depends_default"]
            isOneToOne: false
            referencedRelation: "processors"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe: {
        Row: {
          additional_models: Json | null
          created_at: string
          decision_func: number | null
          description: string | null
          display: Json | null
          id: number
          input_brokers: Json | null
          is_public: boolean | null
          messages: Json[] | null
          name: string
          next_step_options: Json[] | null
          optional_processors: Json | null
          output_brokers: Json | null
          overrides: Json | null
          permanent_processors: Json | null
          primary_model: number | null
          sample_output: string | null
          status: Database["public"]["Enums"]["recipe_status"]
          tags: string[] | null
          temp_id: string | null
          tools: number | null
          updated_at: string
          user: string | null
          validation_func: number | null
          version: number | null
        }
        Insert: {
          additional_models?: Json | null
          created_at?: string
          decision_func?: number | null
          description?: string | null
          display?: Json | null
          id?: number
          input_brokers?: Json | null
          is_public?: boolean | null
          messages?: Json[] | null
          name: string
          next_step_options?: Json[] | null
          optional_processors?: Json | null
          output_brokers?: Json | null
          overrides?: Json | null
          permanent_processors?: Json | null
          primary_model?: number | null
          sample_output?: string | null
          status?: Database["public"]["Enums"]["recipe_status"]
          tags?: string[] | null
          temp_id?: string | null
          tools?: number | null
          updated_at?: string
          user?: string | null
          validation_func?: number | null
          version?: number | null
        }
        Update: {
          additional_models?: Json | null
          created_at?: string
          decision_func?: number | null
          description?: string | null
          display?: Json | null
          id?: number
          input_brokers?: Json | null
          is_public?: boolean | null
          messages?: Json[] | null
          name?: string
          next_step_options?: Json[] | null
          optional_processors?: Json | null
          output_brokers?: Json | null
          overrides?: Json | null
          permanent_processors?: Json | null
          primary_model?: number | null
          sample_output?: string | null
          status?: Database["public"]["Enums"]["recipe_status"]
          tags?: string[] | null
          temp_id?: string | null
          tools?: number | null
          updated_at?: string
          user?: string | null
          validation_func?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_decision_func_fkey"
            columns: ["decision_func"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_primary_model_fkey"
            columns: ["primary_model"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_tools_fkey"
            columns: ["tools"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_validation_func_fkey"
            columns: ["validation_func"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_broker: {
        Row: {
          broker: string
          broker_role: Database["public"]["Enums"]["broker_type"]
          component: string | null
          default_value: string | null
          id: number
          is_required: boolean | null
          recipe: number
        }
        Insert: {
          broker: string
          broker_role: Database["public"]["Enums"]["broker_type"]
          component?: string | null
          default_value?: string | null
          id?: number
          is_required?: boolean | null
          recipe: number
        }
        Update: {
          broker?: string
          broker_role?: Database["public"]["Enums"]["broker_type"]
          component?: string | null
          default_value?: string | null
          id?: number
          is_required?: boolean | null
          recipe?: number
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
            foreignKeyName: "recipe_broker_component_fkey"
            columns: ["component"]
            isOneToOne: false
            referencedRelation: "component"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_broker_recipe_fkey"
            columns: ["recipe"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_broker_recipe_fkey"
            columns: ["recipe"]
            isOneToOne: false
            referencedRelation: "recipe_with_brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_broker_recipe_fkey"
            columns: ["recipe"]
            isOneToOne: false
            referencedRelation: "recipe_with_brokers"
            referencedColumns: ["recipe_id"]
          },
        ]
      }
      recipe_display_options: {
        Row: {
          id: number
          name: string
          params: Json | null
          status: Database["public"]["Enums"]["recipe_status"] | null
        }
        Insert: {
          id?: number
          name: string
          params?: Json | null
          status?: Database["public"]["Enums"]["recipe_status"] | null
        }
        Update: {
          id?: number
          name?: string
          params?: Json | null
          status?: Database["public"]["Enums"]["recipe_status"] | null
        }
        Relationships: []
      }
      recipe_models: {
        Row: {
          id: number
          model: number | null
          order: number | null
          recipe: number | null
          status: string | null
        }
        Insert: {
          id?: number
          model?: number | null
          order?: number | null
          recipe?: number | null
          status?: string | null
        }
        Update: {
          id?: number
          model?: number | null
          order?: number | null
          recipe?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_models_model_fkey"
            columns: ["model"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_models_recipe_fkey"
            columns: ["recipe"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_models_recipe_fkey"
            columns: ["recipe"]
            isOneToOne: false
            referencedRelation: "recipe_with_brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_models_recipe_fkey"
            columns: ["recipe"]
            isOneToOne: false
            referencedRelation: "recipe_with_brokers"
            referencedColumns: ["recipe_id"]
          },
        ]
      }
      registered_functions: {
        Row: {
          class_name: string | null
          common_name: string
          description: string | null
          id: number
          last_update: string
          module_path: string
          name: string
          tags: string[] | null
        }
        Insert: {
          class_name?: string | null
          common_name: string
          description?: string | null
          id?: number
          last_update?: string
          module_path: string
          name: string
          tags?: string[] | null
        }
        Update: {
          class_name?: string | null
          common_name?: string
          description?: string | null
          id?: number
          last_update?: string
          module_path?: string
          name?: string
          tags?: string[] | null
        }
        Relationships: []
      }
      tools: {
        Row: {
          additional_params: Json | null
          args: Json | null
          created_at: string
          id: number
          name: string | null
          official_function: number | null
          returns: Json | null
          source: Json | null
          user: string | null
        }
        Insert: {
          additional_params?: Json | null
          args?: Json | null
          created_at?: string
          id?: number
          name?: string | null
          official_function?: number | null
          returns?: Json | null
          source?: Json | null
          user?: string | null
        }
        Update: {
          additional_params?: Json | null
          args?: Json | null
          created_at?: string
          id?: number
          name?: string | null
          official_function?: number | null
          returns?: Json | null
          source?: Json | null
          user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tools_official_function_fkey"
            columns: ["official_function"]
            isOneToOne: false
            referencedRelation: "registered_functions"
            referencedColumns: ["id"]
          },
        ]
      }
      user: {
        Row: {
          account_status: string | null
          account_type: string | null
          auth_id: string | null
          auth0_id: string | null
          auth0_sid: string | null
          created_at: string | null
          email: string | null
          email_verified: boolean | null
          first_name: string | null
          full_name: string | null
          last_activity: string | null
          last_login: string | null
          last_name: string | null
          matrix_id: string
          nickname: string | null
          org_id: string | null
          phone: string | null
          phone_verified: boolean | null
          picture: string | null
          preferred_picture: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string | null
          account_type?: string | null
          auth_id?: string | null
          auth0_id?: string | null
          auth0_sid?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          full_name?: string | null
          last_activity?: string | null
          last_login?: string | null
          last_name?: string | null
          matrix_id?: string
          nickname?: string | null
          org_id?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          picture?: string | null
          preferred_picture?: string | null
          role?: string | null
          updated_at: string
        }
        Update: {
          account_status?: string | null
          account_type?: string | null
          auth_id?: string | null
          auth0_id?: string | null
          auth0_sid?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          first_name?: string | null
          full_name?: string | null
          last_activity?: string | null
          last_login?: string | null
          last_name?: string | null
          matrix_id?: string
          nickname?: string | null
          org_id?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          picture?: string | null
          preferred_picture?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["org_id"]
          },
        ]
      }
    }
    Views: {
      recipe_with_brokers: {
        Row: {
          additional_models: Json | null
          created_at: string | null
          decision_func: number | null
          description: string | null
          display: Json | null
          id: number | null
          input_broker_objects: Json | null
          input_brokers: Json | null
          is_public: boolean | null
          messages: Json[] | null
          name: string | null
          next_step_options: Json[] | null
          optional_processors: Json | null
          output_broker_objects: Json | null
          output_brokers: Json | null
          overrides: Json | null
          permanent_processors: Json | null
          primary_model: number | null
          recipe_id: number | null
          sample_output: string | null
          status: Database["public"]["Enums"]["recipe_status"] | null
          tags: string[] | null
          temp_id: string | null
          tools: number | null
          updated_at: string | null
          user: string | null
          validation_func: number | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_decision_func_fkey"
            columns: ["decision_func"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_primary_model_fkey"
            columns: ["primary_model"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_tools_fkey"
            columns: ["tools"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_validation_func_fkey"
            columns: ["validation_func"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_assistant_message: {
        Args: {
          chatid: string
          message: string
        }
        Returns: undefined
      }
      add_custom_message:
        | {
            Args: {
              chat_id: string
              id: string
              role: string
              text: string
              index?: number
              created_at?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              chat_id: string
              role: string
              message: string
              created_at: string
              index: number
            }
            Returns: undefined
          }
        | {
            Args: {
              chatid: string
              role: string
              message: string
              messageindex?: number
              messagecreatedat?: string
            }
            Returns: undefined
          }
      add_multiple_custom_messages: {
        Args: {
          p_chat_id: string
          messages: Json[]
        }
        Returns: undefined
      }
      add_one_broker: {
        Args: {
          p_id: string
          p_display_name: string
          p_data_type: string
          p_description?: string
          p_official_name?: string
          p_component_type?: string
          p_validation_rules?: Json
          p_tooltip?: string
          p_sample_entries?: string
          p_user_id?: string
          p_additional_params?: Json
          p_default_value?: string
          p_uid?: string
          p_matrix_id?: string
          p_default_source?: Database["public"]["Enums"]["default_source"]
          p_ready?: boolean
          p_other_source_params?: Json
          p_component?: number
        }
        Returns: {
          id: string
          display_name: string
          data_type: string
          description: string
          official_name: string
          component_type: string
          validation_rules: Json
          tooltip: string
          sample_entries: string
          user_id: string
          additional_params: Json
          default_value: string
          uid: string
          matrix_id: string
          default_source: Database["public"]["Enums"]["default_source"]
          ready: boolean
          other_source_params: Json
          component: number
        }[]
      }
      add_one_processor: {
        Args: {
          p_name: string
          p_depends_default: number
          p_default_extractors: Json[]
          p_params: Json
        }
        Returns: {
          id: number
          name: string
          depends_default: number
          default_extractors: Json[]
          params: Json
        }[]
      }
      add_system_message: {
        Args: {
          chat_id: string
          message: string
        }
        Returns: undefined
      }
      add_user_message: {
        Args: {
          chat_id: string
          message: string
        }
        Returns: undefined
      }
      clone_and_edit_chat: {
        Args: {
          original_chat_id: string
          edited_index: number
          new_message: string
          new_message_role: string
        }
        Returns: {
          chatId: string
          chatTitle: string
          createdAt: string
          lastEdited: string
          matrixId: string
          metadata: Json
          messages: Json
        }[]
      }
      clone_chat: {
        Args: {
          original_chat_id: string
        }
        Returns: {
          chatId: string
          chatTitle: string
          createdAt: string
          lastEdited: string
          matrixId: string
          metadata: Json
          messages: Json
        }[]
      }
      create_chat: {
        Args: {
          chat_data: string
        }
        Returns: string
      }
      create_chat_and_messages: {
        Args: {
          start_chat: Json
        }
        Returns: undefined
      }
      create_recipe_with_brokers: {
        Args: {
          recipe_data: Json
          input_brokers: Json[]
          output_brokers: Json[]
        }
        Returns: Json
      }
      delete_chat: {
        Args: {
          input_chat_id: string
        }
        Returns: boolean
      }
      delete_recipe_with_brokers: {
        Args: {
          recipe_id: number
        }
        Returns: undefined
      }
      edit_message: {
        Args: {
          p_message_id: string
          p_updates: Json
        }
        Returns: undefined
      }
      fetch_all_broker: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          display_name: string
          data_type: string
          description: string
          official_name: string
          component_type: string
          validation_rules: Json
          tooltip: string
          sample_entries: string
          user_id: string
          additional_params: Json
          default_value: string
          uid: string
          matrix_id: string
          default_source: Database["public"]["Enums"]["default_source"]
          ready: boolean
          other_source_params: Json
          component: number
        }[]
      }
      fetch_all_processors: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: number
          name: string
          depends_default: number
          default_extractors: Json[]
          params: Json
        }[]
      }
      fetch_all_recipe_template_overviews: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: number
          name: string
          description: string
          tags: string[]
          input_brokers: Json
        }[]
      }
      fetch_all_tools: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: number
          name: string
          source: Json
          args: Json
          returns: Json
          official_function: number
          user: string
          created_at: string
          additional_params: Json
        }[]
      }
      fetch_broker_by_id: {
        Args: {
          broker_id: string
        }
        Returns: {
          id: string
          created_at: string
          display_name: string
          data_type: string
          description: string
          official_name: string
          component_type: string
          validation_rules: Json
          tooltip: string
          sample_entries: string
          user_id: string
          additional_params: Json
          default_value: string
          uid: string
          matrix_id: string
          default_source: string
          ready: boolean
          other_source_params: Json
          component: number
        }[]
      }
      fetch_broker_with_component: {
        Args: {
          p_id: string
        }
        Returns: {
          id: string
          created_at: string
          display_name: string
          data_type: string
          description: string
          official_name: string
          component_type: string
          validation_rules: Json
          tooltip: string
          sample_entries: string
          user_id: string
          additional_params: Json
          default_value: string
          uid: string
          matrix_id: string
          default_source: string
          ready: boolean
          other_source_params: Json
          component: number
          component_data: Json
        }[]
      }
      fetch_by_id_broker: {
        Args: {
          record_id: string
        }
        Returns: {
          id: string
          display_name: string
          data_type: string
          description: string
          official_name: string
          component_type: string
          validation_rules: Json
          tooltip: string
          sample_entries: string
          user_id: string
          additional_params: Json
          default_value: string
          uid: string
          matrix_id: string
          default_source: Database["public"]["Enums"]["default_source"]
          ready: boolean
          other_source_params: Json
          component: number
        }[]
      }
      fetch_by_id_processor: {
        Args: {
          p_id: number
        }
        Returns: {
          id: number
          name: string
          depends_default: number
          default_extractors: Json[]
          params: Json
        }[]
      }
      fetch_by_id_processors: {
        Args: {
          record_id: number
        }
        Returns: {
          id: number
          name: string
          depends_default: number
          default_extractors: Json[]
          params: Json
        }[]
      }
      fetch_by_id_tools: {
        Args: {
          record_id: number
        }
        Returns: {
          id: number
          name: string
          source: Json
          args: Json
          returns: Json
          official_function: number
          user: string
          created_at: string
          additional_params: Json
        }[]
      }
      fetch_chat_details: {
        Args: {
          user_matrix_id: string
        }
        Returns: {
          chatId: string
          chatTitle: string
          createdAt: string
          lastEdited: string
          matrixId: string
          metadata: Json
          messages: string[]
        }[]
      }
      fetch_chat_messages: {
        Args: {
          p_chat_id: string
        }
        Returns: {
          chatid: string
          messages: Json
        }[]
      }
      fetch_complete_chat_with_messages: {
        Args: {
          p_chat_id: string
        }
        Returns: Json
      }
      fetch_messages: {
        Args: {
          matrix_chat_id: string
        }
        Returns: {
          chatId: string
          createdAt: string
          id: string
          index: number
          text: string
          role: string
        }[]
      }
      fetch_recipe: {
        Args: {
          p_id: number
        }
        Returns: {
          id: number
          name: string
          description: string
          user: string
          tags: string[]
          overrides: Json
          input_brokers: Json
          output_brokers: Json
          sample_output: string
          is_public: boolean
          status: string
          version: number
          created_at: string
          updated_at: string
          permanent_processors: Json
          optional_processors: Json
          next_step_options: string[]
          decision_func: number
          validation_func: number
          primary_model: number
          tools: number
          display: Json
          messages: string[]
          additional_models: Json
          temp_id: string
        }[]
      }
      fetch_recipe_brokers: {
        Args: {
          p_recipe_id: number
        }
        Returns: {
          id: number
          recipe: number
          broker: Json
          broker_role: string
          default_value: string
          is_required: boolean
          component: string
        }[]
      }
      fetch_recipe_with_brokers: {
        Args: {
          p_id: number
        }
        Returns: {
          id: number
          name: string
          description: string
          user_id: string
          tags: string[]
          overrides: Json
          input_brokers: Json
          output_brokers: Json
          sample_output: string
          is_public: boolean
          status: string
          version: number
          created_at: string
          updated_at: string
          permanent_processors: Json
          optional_processors: Json
          next_step_options: string[]
          decision_func: number
          validation_func: number
          primary_model: number
          tools: number
          display: Json
          messages: string[]
          additional_models: Json
          temp_id: string
        }[]
      }
      fetch_user_chats: {
        Args: {
          user_matrix_id: string
        }
        Returns: {
          chatId: string
          chatTitle: string
          createdAt: string
          lastEdited: string
          matrixId: string
          metadata: Json
        }[]
      }
      generic_db_request_json: {
        Args: {
          _input_data: Json
        }
        Returns: Json
      }
      insert_broker_entries: {
        Args: {
          brokers: Json
        }
        Returns: undefined
      }
      insert_single_broker: {
        Args: {
          broker: Json
        }
        Returns: undefined
      }
      read_chat: {
        Args: {
          input_chat_id: string
        }
        Returns: Json
      }
      start_ai_chat: {
        Args: {
          p_chat_id: string
          p_chat_title: string
          p_created_at: string
          p_last_edited: string
          p_matrix_id: string
          p_metadata: Json
          m_id_1: string
          m_role_1: string
          m_text_1: string
          m_index_1: number
          m_created_at_1: string
          m_id_2: string
          m_role_2: string
          m_text_2: string
          m_index_2: number
          m_created_at_2: string
        }
        Returns: {
          chatId: string
          chatTitle: string
          createdAt: string
          lastEdited: string
          matrixId: string
          metadata: Json
          messageId: string
          messageRole: string
          messageText: string
          messageIndex: number
          messageCreatedAt: string
        }[]
      }
      start_chat: {
        Args: {
          p_user_matrix_id: string
          p_new_chat_id: string
          p_new_chat_title: string
          p_new_system_entry: Json
          p_new_user_entry: Json
        }
        Returns: string
      }
      start_new_chat: {
        Args: {
          user_matrix_id: string
          system_message: string
          user_message: string
        }
        Returns: {
          chatId: string
          chatTitle: string
          createdAt: string
          lastEdited: string
          matrixId: string
          metadata: Json
          messages: Json
        }[]
      }
      update_chat: {
        Args: {
          chat_data: Json
        }
        Returns: Json
      }
      update_chat_title: {
        Args: {
          input_chat_id: string
          new_title: string
        }
        Returns: Json
      }
      update_recipe_with_brokers: {
        Args: {
          recipe_data: Json
          input_brokers: Json[]
          output_brokers: Json[]
        }
        Returns: Json
      }
      upsert_from_auth0: {
        Args: {
          p_auth0_id: string
          p_auth0_sid: string
          p_first_name: string
          p_last_name: string
          p_email: string
          p_email_verified: boolean
          p_full_name: string
          p_nickname: string
          p_picture: string
          p_updated_at: string
          p_phone: string
          p_phone_verified: boolean
        }
        Returns: {
          matrixId: string
          auth0Id: string
          auth0Sid: string
          createdAt: string
          firstName: string
          lastName: string
          nickname: string
          fullName: string
          picture: string
          updatedAt: string
          accountType: string
          accountStatus: string
          orgId: string
          role: string
          phone: string
          phoneVerified: boolean
          email: string
          emailVerified: boolean
          preferredPicture: string
          lastLogin: string
          lastActivity: string
        }[]
      }
      upsert_user: {
        Args: {
          p_auth0_id: string
          p_auth0_sid: string
          p_first_name: string
          p_last_name: string
          p_email: string
          p_email_verified: boolean
          p_full_name: string
          p_nickname: string
          p_picture: string
          p_updated_at: string
          p_phone: string
          p_phone_verified: boolean
        }
        Returns: {
          matrixId: string
          auth0Id: string
          auth0Sid: string
          createdAt: string
          firstName: string
          lastName: string
          nickname: string
          fullName: string
          picture: string
          updatedAt: string
          accountType: string
          accountStatus: string
          orgId: string
          role: string
          phone: string
          phoneVerified: boolean
          email: string
          emailVerified: boolean
          preferredPicture: string
          lastLogin: string
          lastActivity: string
        }[]
      }
      upsert_with_any_data: {
        Args: {
          p_matrix_id: string
          p_updated_at: string
          p_first_name?: string
          p_last_name?: string
          p_nickname?: string
          p_full_name?: string
          p_picture?: string
          p_account_type?: string
          p_account_status?: string
          p_org_id?: string
          p_role?: string
          p_phone?: string
          p_phone_verified?: boolean
          p_email?: string
          p_email_verified?: boolean
          p_preferred_picture?: string
          p_last_login?: string
          p_last_activity?: string
        }
        Returns: {
          matrixId: string
          firstName: string
          lastName: string
          nickname: string
          fullName: string
          picture: string
          updatedAt: string
          accountType: string
          accountStatus: string
          orgId: string
          role: string
          phone: string
          phoneVerified: boolean
          email: string
          emailVerified: boolean
          preferredPicture: string
          lastLogin: string
          lastActivity: string
        }[]
      }
    }
    Enums: {
      broker_type: "input_broker" | "output_broker"
      component_type:
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
      data_type: "str" | "int" | "float" | "bool" | "dict" | "list" | "url"
      default_source:
        | "user_input"
        | "database"
        | "pre-defined"
        | "api"
        | "function"
        | "environment"
        | "other"
      presentation_visibility: "public" | "private" | "link"
      recipe_status:
        | "draft"
        | "other"
        | "in_review"
        | "active_testing"
        | "live"
        | "archived"
    }
    CompositeTypes: {
      chat_messages_response_type: {
        chat_id: string | null
        messages: Database["public"]["CompositeTypes"]["message_type"][] | null
      }
      chat_type: {
        chat_id: string | null
        chat_title: string | null
        created_at: string | null
        last_edited: string | null
        matrix_id: string | null
        metadata: Json | null
      }
      message_type: {
        chat_id: string | null
        created_at: string | null
        id: string | null
        index: number | null
        text: string | null
        role: string | null
      }
      simple_message_type: {
        index: number | null
        text: string | null
        role: string | null
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
