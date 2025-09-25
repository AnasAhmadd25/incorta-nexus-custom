import React from 'react';
import { IntlProvider } from 'react-intl';

interface IntlProviderWrapperProps {
  children: React.ReactNode;
}

// Mock messages for internationalization
const messages = {
  'en': {
    'dashboard.ai.actions.clear_chat_history.title': 'Clear Chat History',
    'dashboard.ai.actions.clear_chat_history.description': 'This will clear all messages in the current conversation.',
    'dashboard.ai.actions.reset': 'Reset Conversation',
    'dashboard.ai.actions.close': 'Close',
    'dashboard.ai.actions.clearHistoryContext': 'Clear History Context',
    'dashboard.ai.actions.stopGeneratingAnswer': 'Stop Generating Answer',
    'dashboard.ai.actions.showMore': 'Show More',
    'dashboard.ai.actions.showLess': 'Show Less',
    'dashboard.ai.warnings.answerQuestionInProgress': 'Answer generation in progress',
    'dashboard.ai.warnings.verifiedViewsRequired': 'Verified views are required for this operation',
    'dashboard.ai.viewMore': 'View More',
    'dashboard.ai.messages.recommended_questions': 'Recommended Questions',
    'dashboard.ai.messages.related_insights': 'Related Insights',
    'dashboard.ai.messages.recommended_actions': 'Recommended Actions',
    'dashboard.ai.messages.changedBusinessViewTo': 'Changed business view to',
    'dashboard.ai.messages.error': 'An error occurred',
    'common.clear': 'Clear',
    'common.cancel': 'Cancel'
  }
};

const IntlProviderWrapper: React.FC<IntlProviderWrapperProps> = ({ children }) => {
  return (
    <IntlProvider
      locale="en"
      messages={messages['en']}
      defaultLocale="en"
    >
      {children}
    </IntlProvider>
  );
};

export default IntlProviderWrapper;