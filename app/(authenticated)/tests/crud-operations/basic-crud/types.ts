// basic-crud/types.ts

import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityStateField, LoadingState, MatrxRecordId} from '@/lib/redux/entity/types';
import {Callback} from "trough";
import { UseFormReturn } from 'react-hook-form';

export type FormMode = 'view' | 'edit' | 'create';



