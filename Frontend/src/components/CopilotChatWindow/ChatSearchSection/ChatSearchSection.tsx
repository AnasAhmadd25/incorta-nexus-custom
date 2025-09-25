import { Button, Divider, Space, Tooltip } from 'antd';
import { DatabaseOutlined, SendOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { Mention, MentionsInput as MentionsInputComponent } from 'react-mentions';
import { ContextSwitchOptions, SchemaContextOption } from '../CopilotChatWindow';
import { useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { FormattedMessage } from 'react-intl';
import { debounce } from 'lodash';
import { BeatLoader } from 'react-spinners';
import './ChatSearchSection.less';

const IMPORT_CHAT_HISTORY_COMMAND = '/import-chat';

type ChatSearchSectionProps = {
  addUserMessage: (message: string, messageColor?: string) => void;
  isLoading?: boolean;
  searchValue: string;
  setSearchValue: Function;
  searchPlaceholder?: string;
  onClearChatContext?: () => void;
  allowStopAnswerGeneration?: boolean;
  searchPopover?: {
    container: React.ReactNode;
    handler: {
      onClick: () => void;
    };
  };
  openSchemaSelectionDialog: (options?: boolean | SchemaContextOption) => void;
  contextSwitchOptions?: ContextSwitchOptions;
};

function endsWith(str: string, symbol: string) {
  // Remove trailing whitespace characters
  const trimmedStr = str.trimEnd();
  // Check if the trimmed string ends with '#'
  return trimmedStr.endsWith(symbol);
}

const MaxLicenseTextLength = 100;

const LicenseDisclaimer: any = ({ license }: { license: string }) => {
  if (!license) return <></>;

  if (license?.length <= MaxLicenseTextLength)
    return <span className="license_disclaimer">{license}</span>;
  else if (license?.length > MaxLicenseTextLength) {
    const trimmedLicense = license.substring(0, MaxLicenseTextLength);

    return (
      <div>
        <span className="license_disclaimer">{trimmedLicense}</span>
        <Tooltip title={license}>
          <span className="view_more_license">
            <FormattedMessage id="dashboard.ai.viewMore" defaultMessage="View More" />
          </span>
        </Tooltip>
      </div>
    );
  }
};

const ChatSearchSection = ({
  addUserMessage,
  isLoading,
  searchValue,
  setSearchValue,
  onClearChatContext,
  allowStopAnswerGeneration,
  searchPopover,
  openSchemaSelectionDialog,
  contextSwitchOptions
}: ChatSearchSectionProps) => {
  const mentionsInputRef = useRef<any>();
  const inputRef = useRef<any>();
  const isMobile = window.innerWidth <= 768;
  const [searchhOverridId] = useState(() => uuidv4());
  const isLoadingDataSuggestions = false; // This would come from query state
  const inputHasValue = searchValue && /\S/.test(searchValue);
  const footerRef = useRef<any>(null);
  const fileInputRef = useRef<any>(null);
  const [selectedSearchColumns, setSelectedSearchColumns] = useState<string[]>([]);

  // Mock data - in real app these would come from Redux/API
  const schema = 'SampleSchema';
  const businessView = 'SampleView';
  const schemaType = 'BUSINESS';
  const isPanelOpen = true;
  const selectedViewIsVerified = true;
  const searchShortcuts = [
    { shortcut: '/help', description: 'Show available commands' },
    { shortcut: '/clear', description: 'Clear conversation' }
  ];
  const businessViews = [
    { 
      name: 'SampleView', 
      columns: [
        { name: 'id', label: 'ID', description: 'Unique identifier' },
        { name: 'name', label: 'Name', description: 'Display name' }
      ] 
    }
  ];

  const messageBGColor = contextSwitchOptions?.options?.find(
    option => option.value === contextSwitchOptions.activeContext
  )?.bgColor;

  const openFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current?.click();
    }
  };

  useEffect(() => {
    // Reset search columns when business view changes
    setSelectedSearchColumns([]);
  }, [businessView]);

  useEffect(() => {
    if (inputRef.current && isPanelOpen) {
      inputRef.current.focus();
    }
  }, [isPanelOpen]);

  const debounceQuerySearchForKeyword = useMemo(
    () =>
      debounce(
        (query, callback) => {
          // Mock search results - in real app this would query the API
          if (!businessView) return;
          
          const mockResults = [
            { display: 'Sample Data 1', id: 'sample1', value: 'Sample Value 1' },
            { display: 'Sample Data 2', id: 'sample2', value: 'Sample Value 2' }
          ];
          
          callback(mockResults.filter(item => 
            item.display.toLowerCase().includes(query.toLowerCase())
          ));
        },
        selectedSearchColumns?.length ? 0 : 500
      ),
    [schemaType, schema, businessView, searchhOverridId, selectedSearchColumns]
  );

  // Function to handle file selection
  const handleFileChange = (event: any) => {
    const files = event.target.files;
    if (files.length > 0) {
      if (files[0]) {
        const reader = new FileReader();
        reader.readAsText(files[0]);

        reader.onload = () => {
          try {
            const chatHistory: any = JSON.parse(reader.result as any);
            // In real app, this would dispatch to Redux
            console.log('Chat history imported:', chatHistory);
            setSearchValue('');
          } finally {
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        };
      }
    }
  };

  const onAskingQuestion = (e: any) => {
    if (!isLoading && inputHasValue) {
      e.preventDefault();

      if (searchValue === IMPORT_CHAT_HISTORY_COMMAND) {
        openFileUpload();
      } else {
        addUserMessage(searchValue, messageBGColor);
        setSearchValue('');
      }
    }
  };

  const handleChange = (newValue: any) => {
    setSearchValue(newValue);
  };

  const moveCursorToTheEnd = (event: React.FocusEvent<HTMLTextAreaElement, Element>) => {
    if (!!searchValue) {
      event.target.setSelectionRange(searchValue?.length, searchValue?.length);
    }
  };

  useEffect(() => {
    if (footerRef?.current) {
      if (contextSwitchOptions?.activeContext) {
        const option = contextSwitchOptions?.options?.find(
          option => option.value === contextSwitchOptions.activeContext
        );
        footerRef.current.style.setProperty('--selected-option-color', option?.color);
        footerRef.current.style.setProperty('--selected-option-bg-color', option?.bgColor);
      } else {
        footerRef.current.style.removeProperty('--selected-option-color');
        footerRef.current.style.removeProperty('--selected-option-bg-color');
      }
    }
  }, [contextSwitchOptions?.activeContext, contextSwitchOptions?.options]);

  const showLoadingSuggestion =
    isLoadingDataSuggestions && searchValue?.length > 0
      ? {
          customSuggestionsContainer: (props: any) => {
            return (
              <div className="loading-suggestions-data">
                <BeatLoader speedMultiplier={0.5} size={9} color="rgba(77, 114, 179, 0.7)" />
                <div></div>
              </div>
            );
          }
        }
      : {};

  return (
    <div className="copilot-chat-footer" ref={footerRef}>
      {searchPopover && searchPopover.container}
      <div className={classNames('inc-augmented-analytics-search')}>
        {contextSwitchOptions?.options?.length! > 0 ? (
          <div className="inc-augmented-analytics-search__context-options">
            {contextSwitchOptions?.options.map((option, index) => (
              <div
                key={index}
                className={classNames('inc-augmented-analytics-search__context-options__option', {
                  'inc-augmented-analytics-search__context-options__option-disabled': isLoading
                })}
                data-testid={`context-switch-option-${option.label}`}
                onClick={() => {
                  if (!isLoading) {
                    option.onClick(option.value);
                  }
                }}
                style={
                  contextSwitchOptions.activeContext === option.value
                    ? {
                        borderColor: option.color
                      }
                    : {}
                }
              >
                <Tooltip title={option.tooltip}>{option.label}</Tooltip>
              </div>
            ))}
          </div>
        ) : (
          <></>
        )}

        <div className="inc-augmented-analytics-search-input-wrapper">
          <div className={classNames('inc-augmented-analytics-search-section')}>
            <div className="inc-augmented-analytics-search-section__input-container">
              <MentionsInputComponent
                ref={mentionsInputRef}
                inputRef={inputRef}
                value={searchValue}
                onChange={(_, newValue) => {
                  handleChange(newValue);
                }}
                className={`input ${isMobile ? 'input--mobile' : ''}`}
                data-testid="inc-copilot__question-text-box"
                onKeyDown={e => {
                  if ((!e.shiftKey && e.key === 'Enter') || !e.key) {
                    onAskingQuestion(e);
                  }
                }}
                allowSpaceInQuery
                forceSuggestionsAboveCursor
                placeholder={'Ask Incorta Nexus'}
                onFocus={moveCursorToTheEnd}
                autoFocus
                minLength={0}
                {...searchPopover?.handler}
                {...showLoadingSuggestion}
              >
                <Mention
                  trigger="/"
                  data={(query, callback) => {
                    if (searchValue?.[0] === '/' && searchValue === '/' + query) {
                      callback(
                        searchShortcuts?.filter(e =>
                          e?.shortcut?.toLowerCase().includes(query.toLowerCase())
                        ) as any
                      );
                    }
                  }}
                  className="mention"
                  appendSpaceOnAdd
                  markup="command[__display__](__id__)"
                />
                <Mention
                  trigger={'@'}
                  isLoading
                  data={(query, callback) => {
                    const selectedView = businessViews?.find(e => e.name === businessView);
                    const columns =
                      selectedView?.columns?.filter(
                        (e: any) =>
                          e?.label?.toLowerCase().includes(query.toLowerCase()) ||
                          e?.name?.toLowerCase().includes(query.toLowerCase()) ||
                          e?.description?.toLowerCase().includes(query.toLowerCase())
                      ) || [];

                    callback(
                      columns?.map((e: any, idx: number) => ({
                        display: e?.label || e?.name,
                        showGroupHeader: idx === 0,
                        groupName: schema + '.' + businessView,
                        subHeadline: e?.name,
                        id: schema + '.' + businessView + '.' + e?.name
                      }))
                    );
                  }}
                  appendSpaceOnAdd
                  className="data-search"
                  displayTransform={(_, display) => '@' + display}
                  markup="@[__display__](__id__)"
                />
                <Mention
                  onAdd={(id, display) => {
                    if (id === 'no-results-found') {
                      setSearchValue((prev: string) =>
                        prev?.replace(`[${display}](${id})`, display)
                      );
                    }
                  }}
                  isLoading={true}
                  trigger="#"
                  data={debounceQuerySearchForKeyword}
                  className="data-search"
                  appendSpaceOnAdd
                  markup="#[__display__](__id__)"
                />
              </MentionsInputComponent>
            </div>
          </div>

          <div className="inc-augmented-analytics-search-input-wrapper__footer_actions">
            <div className="inc-augmented-analytics-search-input-wrapper__footer_actions_left">
              <Space align="center" size={'small'}>
                <Tooltip title="Upload files">
                  <Button
                    type="text"
                    onClick={() => openFileUpload()}
                    className="file-upload-btn"
                    icon={<span>📎</span>}
                    size="small"
                  >
                    Attach
                  </Button>
                </Tooltip>
              </Space>
            </div>
            <div>
              <Button
                disabled={!inputHasValue}
                loading={isLoading}
                type="text"
                onClick={onAskingQuestion}
                icon={<SendOutlined />}
                data-testid="inc-copilot__submit-question-btn"
                className="inc-augmented-analytics-search-section__submit-btn"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="copilot-chat-footer__disclaimer">
        <div>
          <LicenseDisclaimer license="Powered by AI. Results may vary." />
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ChatSearchSection;
