import { createFieldThunk } from "../thunks/fieldBuilderThunks";
import { normalizeFieldDefinitionWithUuid } from "@/features/applet/utils/field-normalization";
import { v4 as uuidv4 } from "uuid";
import { createContainerThunk } from "../thunks/containerBuilderThunks";
import { AppDispatch } from "@/lib/redux/store";
import { getCompiledRecipeByVersionWithNeededBrokers } from "@/features/workflows/service/recipe-service";
import { convertToKebabCase } from "@/utils/text/stringUtils";
import { createAppletThunk, updateAppletThunk } from "../thunks/appletBuilderThunks";
import { selectAppletById } from "../selectors/appletSelectors";
import { RootState } from "@/lib/redux/store";
import { isAppletSlugAvailable } from "../service/customAppletService";
import { BrokerMapping, NeededBroker } from "@/types/customAppTypes";

export const createFieldFromBroker = async (brokerName: string, dispatch: AppDispatch) => {
    const field = normalizeFieldDefinitionWithUuid({ component: "textarea", label: brokerName });
    console.log("field", field);
    const result = await dispatch(createFieldThunk(field)).unwrap();
    return result;
};

export const createContainerFromRecipe = async (recipeName: string, neededBrokers: NeededBroker[], dispatch: AppDispatch) => {
    // First, create all the fields
    const fields = await Promise.all(neededBrokers.map((broker) => createFieldFromBroker(broker.name, dispatch)));
    console.log("Created fields:", fields);
    
    // Create the container without fields first
    const container = {
        id: uuidv4(),
        label: `${recipeName} Input`,
        shortLabel: `${recipeName}`,
        fields: [], // Start with empty fields
    };

    const createdContainer = await dispatch(createContainerThunk(container)).unwrap();
    console.log("Created container:", createdContainer);
    
    // Now add each field to the container using the dedicated function
    const { addFieldToGroup } = await import("../service/fieldContainerService");
    
    for (const field of fields) {
        if (field.id) {
            console.log(`Adding field ${field.id} to container ${createdContainer.id}`);
            await addFieldToGroup(createdContainer.id, field.id);
        }
    }
    
    // Retrieve the updated container with all fields
    const { getComponentGroupById } = await import("../service/fieldContainerService");
    const finalContainer = await getComponentGroupById(createdContainer.id);
    console.log("Final container with fields:", finalContainer);
    
    return {
        container: finalContainer || createdContainer,
        fieldToBrokerMappings: fields.map((field, index) => ({
            fieldId: field.id!,
            brokerId: neededBrokers[index].id
        }))
    };
};

export const createAppletFromRecipe = async (recipeId: string, recipeName: string, dispatch: AppDispatch) => {
    const recipeConfig = await getCompiledRecipeByVersionWithNeededBrokers(recipeId);
    
    if (!recipeConfig) {
        throw new Error(`Recipe with ID ${recipeId} not found`);
    }
    
    // Get needed brokers from the recipe config
    const neededBrokers = recipeConfig.neededBrokers || [];
    
    // Create ONE container with ALL brokers as fields and get the field-to-broker mappings
    const { container, fieldToBrokerMappings } = await createContainerFromRecipe(recipeName, neededBrokers, dispatch);
    console.log("container", container);
    console.log("fieldToBrokerMappings", fieldToBrokerMappings);
    
    // Generate a unique slug
    const baseSlug = convertToKebabCase(recipeName);
    let uniqueSlug = baseSlug;
    let counter = 1;
    
    // Check if the base slug is available, if not, add a number suffix
    while (!(await isAppletSlugAvailable(uniqueSlug))) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
    }

    const appletId = uuidv4();
    
    // Create broker mappings for the applet
    const brokerMappings: BrokerMapping[] = fieldToBrokerMappings.map(mapping => ({
        appletId,
        fieldId: mapping.fieldId,
        brokerId: mapping.brokerId
    }));

    const applet = {
        id: appletId,
        name: `${recipeName} Applet`,
        description: `Auto-generated applet for ${recipeName}`,
        slug: uniqueSlug,
        containers: [container],
        brokerMap: brokerMappings,
        dataSourceConfig: {
            sourceType: "recipe" as const,
            config: {
                id: recipeConfig.id,
                compiledId: recipeConfig.compiledId,
                version: recipeConfig.version,
                neededBrokers: recipeConfig.neededBrokers || []
            }
        },
        compiledRecipeId: recipeConfig.compiledId,
    };
    return dispatch(createAppletThunk(applet)).unwrap();
};

export const updateAppletFromRecipe = async (appletId: string, recipeId: string, dispatch: AppDispatch, getState: () => RootState) => {
    const recipeConfig = await getCompiledRecipeByVersionWithNeededBrokers(recipeId);
    
    if (!recipeConfig) {
        throw new Error(`Recipe with ID ${recipeId} not found`);
    }

    // Get the existing applet to preserve its identity
    const existingApplet = selectAppletById(getState(), appletId);
    if (!existingApplet) {
        throw new Error(`Applet with ID ${appletId} not found`);
    }
    
    // Get needed brokers from the recipe config
    const neededBrokers = recipeConfig.neededBrokers || [];
    
    // Create ONE container with ALL brokers as fields and get the field-to-broker mappings
    const { container, fieldToBrokerMappings } = await createContainerFromRecipe(existingApplet.name, neededBrokers, dispatch);
    
    // Create broker mappings for the applet
    const brokerMappings: BrokerMapping[] = fieldToBrokerMappings.map(mapping => ({
        appletId,
        fieldId: mapping.fieldId,
        brokerId: mapping.brokerId
    }));
    
    // Update the applet with new containers, broker mappings, and source config, preserving identity
    const changes = {
        containers: [container],
        brokerMap: brokerMappings,
        dataSourceConfig: {
            sourceType: "recipe" as const,
            config: {
                id: recipeConfig.id,
                compiledId: recipeConfig.compiledId,
                version: recipeConfig.version,
                neededBrokers: recipeConfig.neededBrokers || []
            }
        },
        compiledRecipeId: recipeConfig.compiledId,
    };
    
    return dispatch(updateAppletThunk({ id: appletId, changes })).unwrap();
};
