export interface SlackTeam {
    id: string;
    name: string;
    domain?: string;
    image_34?: string;
    image_44?: string;
    image_68?: string;
    image_88?: string;
    image_102?: string;
    image_132?: string;
    image_230?: string;
    image_original?: string;
  }
  
  export interface SlackUser {
    id: string;
    name?: string;
    email?: string;
    image_24?: string;
    image_32?: string;
    image_48?: string;
    image_72?: string;
    image_192?: string;
    image_512?: string;
    image_1024?: string;
  }
  
  export interface SlackTokenResponse {
    ok: boolean;
    access_token: string;
    token_type: string;
    scope: string;
    bot_user_id?: string;
    app_id: string;
    team: SlackTeam;
    authed_user: SlackUser;
    error?: string;
    enterprise?: {
      id: string;
      name: string;
    };
    is_enterprise_install?: boolean;
  }