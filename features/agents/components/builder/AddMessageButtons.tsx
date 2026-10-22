"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectAgentMessages } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import {
  setAgentMessages,
} from "@/features/agents/redux/agent-builder.slice";
import type {
  AgentDefinitionMessage,
  TextBlock,
  PrimingMessageRole,
} from "@ai-matrx/chat/agents/types/agent-message-types";

interface AddMessageButtonsProps {
  agentId: string;
}

export function AddMessageButtons({ agentId }: AddMessageButtonsProps) {
  const dispatch = useAppDispatch();
  const allMessages = useAppSelector((state) =>
    selectAgentMessages(state, agentId),
  );

  const handleAddMessage = useCallback(
    (role: PrimingMessageRole) => {
      if (!allMessages) return;
      const textBlock: TextBlock = { type: "text", text: "" };
      const newMessage: AgentDefinitionMessage = { role, content: [textBlock] };
      dispatch(
        setAgentMessages({
          id: agentId,
          messages: [...allMessages, newMessage],
        }),
      );
    },
    [agentId, allMessages, dispatch],
  );

  // An example is the exchange, not half of it: a user turn and its answer, both flagged.
  const handleAddExample = useCallback(() => {
    if (!allMessages) return;
    const turn = (role: PrimingMessageRole): AgentDefinitionMessage => ({
      role,
      content: [{ type: "text", text: "" } as TextBlock],
      flags: { example: true },
    });
    dispatch(
      setAgentMessages({
        id: agentId,
        messages: [...allMessages, turn("user"), turn("assistant")],
      }),
    );
  }, [agentId, allMessages, dispatch]);

  return (
    <>
      <Button
        icon={<Plus />}
        variant="outline"
        onClick={() => handleAddMessage("user")}
        disabled={!allMessages}
      >
        User
      </Button>
      <Button
        icon={<Plus />}
        variant="outline"
        onClick={() => handleAddMessage("assistant")}
        disabled={!allMessages}
      >
        Assistant
      </Button>
      <Button
        icon={<Plus />}
        variant="outline"
        onClick={handleAddExample}
        disabled={!allMessages}
        title="Add an example exchange: a user turn and the answer it should get"
      >
        Example
      </Button>
    </>
  );
}
