import React from 'react';
import { Modal, Select, Button } from 'antd';
import { SchemaContextOption } from '../CopilotChatWindow';

interface SchemaContextSelectionProps {
  setShowSchemaSelectionPanel: (show: boolean | SchemaContextOption) => void;
  schemaContext?: any;
  options?: SchemaContextOption;
  onSchemaSelect: (schemaName: string, viewName: string) => void;
}

const SchemaContextSelection = ({
  setShowSchemaSelectionPanel,
  schemaContext,
  options,
  onSchemaSelect
}: SchemaContextSelectionProps) => {
  const [selectedSchema, setSelectedSchema] = React.useState<string>('');
  const [selectedView, setSelectedView] = React.useState<string>('');

  const mockSchemas = [
    { value: 'schema1', label: 'Sales Schema' },
    { value: 'schema2', label: 'HR Schema' },
    { value: 'schema3', label: 'Finance Schema' }
  ];

  const mockViews = [
    { value: 'view1', label: 'Sales View' },
    { value: 'view2', label: 'Customer View' },
    { value: 'view3', label: 'Product View' }
  ];

  const handleOk = () => {
    if (selectedSchema && selectedView) {
      onSchemaSelect(selectedSchema, selectedView);
    }
  };

  const handleCancel = () => {
    setShowSchemaSelectionPanel(false);
  };

  return (
    <Modal
      title="Select Schema Context"
      open={true}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Select"
      cancelText="Cancel"
      okButtonProps={{
        disabled: !selectedSchema || !selectedView
      }}
    >
      {options?.alertText && (
        <div style={{ marginBottom: 16, padding: 8, backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4 }}>
          {options.alertText}
        </div>
      )}
      
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>Schema:</label>
        <Select
          style={{ width: '100%' }}
          placeholder="Select a schema"
          value={selectedSchema}
          onChange={setSelectedSchema}
          options={mockSchemas}
        />
      </div>
      
      <div>
        <label style={{ display: 'block', marginBottom: 8 }}>Business View:</label>
        <Select
          style={{ width: '100%' }}
          placeholder="Select a business view"
          value={selectedView}
          onChange={setSelectedView}
          options={mockViews}
          disabled={!selectedSchema}
        />
      </div>
    </Modal>
  );
};

export default SchemaContextSelection;