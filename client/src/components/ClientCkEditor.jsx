"use client";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

/** Next SSR에서 ckeditor가 window에 접근하지 않도록 페이지에서 dynamic(ssr:false)로만 로드하세요. */
export default function ClientCkEditor({ data, onChange, config }) {
  return (
    <CKEditor
      editor={ClassicEditor}
      config={config}
      data={data || ""}
      onChange={(_evt, editor) => onChange(editor.getData())}
    />
  );
}
