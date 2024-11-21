// RichTextEditor.tsx
import dynamic from 'next/dynamic';
import React from 'react';

// Charge React Quill uniquement côté client
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
  return (
    <div className="border rounded-md p-2">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder="Commencez à écrire..."
        modules={{
          toolbar: [
            ['bold', 'italic', 'underline'], // Formattage de base
            [{ list: 'ordered' }, { list: 'bullet' }], // Listes
            ['link', 'image'], // Liens et images
          ],
        }}
      />
    </div>
  );
};

export default RichTextEditor;
