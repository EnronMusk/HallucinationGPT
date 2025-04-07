'use client';

import React, { useRef } from 'react';

import {
  DataSourceMenu,
  Props as DataSourceMenuProps,
} from '@/components/Conversation/Composer/DataSourceMenu';
import { EnabledDataSources } from '@/components/Conversation/Composer/EnabledDataSources';
import { IconButton } from '@/components/IconButton';
import { ACCEPTED_FILE_TYPES } from '@/constants';
import { cn } from '@/utils';
import { Tooltip } from '@/components/Shared/Tooltip';
import { Icon } from '@/components/Shared/Icon';
import { useParamsStore, useFilesStore } from '@/stores';
import { useDefaultFileLoaderTool } from '@/hooks/files';

type Props = {
  isStreaming: boolean;
  onUploadFile: (files: File[]) => void;
  onDataSourceMenuToggle: VoidFunction;
  isWebSearchEnabled: boolean;
  onWebSearchToggle: () => void;
  menuProps: DataSourceMenuProps;
};

/**
 * @description Renders the bottom toolbar of the composer that shows available and selected data sources.
 */
export const ComposerToolbar: React.FC<Props> = ({ isStreaming, onUploadFile, menuProps, isWebSearchEnabled, onWebSearchToggle }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { params: { fileIds, tools: enabledTools }, setParams } = useParamsStore();
  const { defaultFileLoaderTool } = useDefaultFileLoaderTool();

  const {
    files: { composerFiles },
    clearComposerFiles,
  } = useFilesStore();
  

  const handleOpenFileExplorer = () => {
    if (fileIds?.length) {
      // Clear files
      setParams({ 
        fileIds: [],
        tools: enabledTools?.filter(t => t.name !== defaultFileLoaderTool?.name)
      });
      clearComposerFiles();
    } else if (fileInputRef.current) {
      // Open file explorer
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUploadFile([...(e.target.files ?? [])]);
  };

  return (
    <div className={cn('flex items-center gap-x-2', 'border-t border-marble-950', 'mx-2 py-2')}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES.join(',')}
        className="hidden"
        onChange={handleFileInputChange}
      />
<Tooltip
        label="Attach file (.PDF, .TXT Max 20 MB)"
        duration={2000}
        showOutline={false}
        hover
        icon={
          <button 
            onClick={handleOpenFileExplorer}
            className={cn(
              'flex items-center gap-x-2 px-3 py-1.5 rounded-full transition-colors',
              (composerFiles?.length ?? 0) > 0
                ? 'bg-primary-100 text-volcanic-900 border border-volcanic-300 text-mushroom-300'
                : 'text-volcanic-300 border border-coral-300 hover:bg-mushroom-900 hover:text-mushroom-300'
            )}
          >
            <Icon 
              name="clip"
              kind={composerFiles?.length  ?? 0 > 0 ? "default" : "outline"}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Attach</span>
          </button>
        }
      />
        <button 
          onClick={onWebSearchToggle}
          className={cn(
            'flex items-center gap-x-2 px-3 py-1.5 rounded-full transition-colors',
            isWebSearchEnabled 
              ? 'bg-primary-100 text-volcanic-900 border border-volcanic-300 text-mushroom-300'
              : 'text-volcanic-300 border border-coral-300 hover:bg-mushroom-900 hover:text-mushroom-300'
          )}
        >
          <Icon 
            name="web"
            kind={isWebSearchEnabled ? "default" : "outline"}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Search</span>
        </button>
      
      <DataSourceMenu {...menuProps} />
      {/* <div className="h-7 w-px bg-marble-950" /> */}
      <EnabledDataSources isStreaming={isStreaming} />
    </div>
  );
};
