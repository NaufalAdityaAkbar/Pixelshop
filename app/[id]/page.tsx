"use client";
import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/src/context/AppContext';
import ToolsViews from '@/src/components/ToolsViews';
import { PageId } from '@/src/types';

export default function ToolPage() {
  const { id } = useParams();
  const router = useRouter();
  const { products, preselectedProduct, addXP, saveGeneratedContent, addCalendarEvents, contents, deleteGeneratedContent, aiTrainer } = useAppContext();
  
  const toolId = (typeof id === 'string' ? id.replaceAll('-', '_') : '') as PageId;
  const validTools = ['caption_tool', 'description_tool', 'content_plan_tool', 'chat_reply_tool', 'competitor_tool'];

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    const currentToolId = id.replaceAll('-', '_');
    if (!validTools.includes(currentToolId)) {
      router.replace('/dashboard');
    }
  }, [id, router]);

  if (!id || typeof id !== 'string' || !validTools.includes(toolId)) {
    return null;
  }

  return (
    <ToolsViews
      toolId={toolId}
      products={products}
      preselectedProduct={preselectedProduct}
      onAddXP={addXP}
      onSaveContent={saveGeneratedContent}
      onAddCalendarEvents={addCalendarEvents}
      onNavigate={(p) => router.push(`/${p.replace('_', '-')}`)}
      contents={contents}
      onDeleteContent={deleteGeneratedContent}
      aiTrainer={aiTrainer}
    />
  );
}
