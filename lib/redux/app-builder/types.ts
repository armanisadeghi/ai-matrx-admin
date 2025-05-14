import { AppletContainer, CustomAppConfig, CustomAppletConfig, FieldDefinition } from "@/types/customAppTypes";

export interface FieldBuilder extends FieldDefinition {
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    isDirty?: boolean;
    isLocal?: boolean;
}

export interface ContainerBuilder extends AppletContainer {
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    isDirty?: boolean;
    isLocal?: boolean;
}

export interface AppletBuilder extends CustomAppletConfig {
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    isDirty?: boolean;
    isLocal?: boolean;
    slugStatus?: 'unchecked' | 'unique' | 'notUnique';
}

export interface AppBuilder extends CustomAppConfig {
    appletIds: string[];
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    isDirty?: boolean;
    isLocal?: boolean;
    isTemplated?: boolean;
    templateType?: 'simple' | 'complex';
    slugStatus?: 'unchecked' | 'unique' | 'notUnique';
}

export interface RuntimeBrokerDefinition {
    id: string;
    name: string;
    dataType: string;
    defaultValue?: any;
  }
  