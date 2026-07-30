import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft, Layers, Columns, Minimize2, RotateCw, Trash2, ShieldAlert } from 'lucide-react';
import ToolLayout from '../components/ToolLayout';
import FileUpload from '../components/FileUpload';
import SEO from '../components/SEO';
import PdfMergeWorkspace from './PdfMergeWorkspace';
import PdfSplitWorkspace from './PdfSplitWorkspace';
import PdfCompressWorkspace from './PdfCompressWorkspace';
import PdfRotateWorkspace from './PdfRotateWorkspace';
import PdfDeleteWorkspace from './PdfDeleteWorkspace';
import PdfExtractWorkspace from './PdfExtractWorkspace';

// Tool configurations in the PDF cluster
const PDF_TOOLS = [
  {
    id: 'pdf-merge',
    title: 'Merge PDF',
    desc: 'Combine multiple PDF files into a single, cohesive document in seconds.',
    badge: 'Popular',
    icon: Layers,
    instructions: [
      'Select or drag and drop multiple PDF files into the upload box.',
      'Reorder or remove files from the queue list if necessary.',
      'Click the "Merge PDF" execution action to compile and download your file.'
    ],
    faqs: [
      { q: 'Is there a limit on the number of PDFs I can merge?', a: 'Under the free tier, you can merge up to 10 files in a single operation. Premium tier allows up to 100 files.' },
      { q: 'Will merging files affect my document format?', a: 'No, page layout configurations, fonts, and images are preserved exactly as they are.' }
    ]
  },
  {
    id: 'pdf-split',
    title: 'Split PDF',
    desc: 'Extract specific pages or separate a document into individual PDF parts.',
    icon: Columns,
    instructions: [
      'Upload a single PDF document.',
      'Specify the range of pages you wish to extract (e.g. 1-4, 7).',
      'Click "Split PDF" to download the processed files.'
    ],
    faqs: [
      { q: 'Can I split password-protected files?', a: 'You must unlock the file first before uploading it to the split utility.' }
    ]
  },
  {
    id: 'pdf-compress',
    title: 'Compress PDF',
    desc: 'Reduce file size of your PDF while maintaining optimal resolution.',
    badge: 'High Value',
    icon: Minimize2,
    instructions: [
      'Upload a single PDF document.',
      'Select the compression level (Recommended, Extreme, or Low).',
      'Click "Compress PDF" and download the compressed copy.'
    ],
    faqs: [
      { q: 'Does compressing reduce PDF image resolution?', a: 'It optimizes images to 150 DPI which is standard for web viewing, matching standard readable parameters.' }
    ]
  },
  {
    id: 'pdf-rotate',
    title: 'Rotate PDF',
    desc: 'Rotate PDF pages clockwise or counter-clockwise as needed.',
    icon: RotateCw,
    instructions: [
      'Upload the PDF document you want to rotate.',
      'Rotate specific pages or all pages using the visual grid controls.',
      'Click "Apply Rotation" to download the document.'
    ],
    faqs: []
  },
  {
    id: 'pdf-delete-pages',
    title: 'Delete PDF Pages',
    desc: 'Remove unwanted pages from a PDF document visually.',
    icon: Trash2,
    instructions: [
      'Upload the PDF file.',
      'Select the pages you want to delete by clicking page preview cards.',
      'Click "Delete Selected Pages" and download the optimized PDF.'
    ],
    faqs: []
  },
  {
    id: 'pdf-extract-pages',
    title: 'Extract PDF Pages',
    desc: 'Extract specific pages from a PDF file into a new document.',
    icon: FileText,
    instructions: [
      'Upload the PDF document.',
      'Select pages you want to extract by checking page previews.',
      'Click "Extract Selected Pages" to compile and download the new PDF.'
    ],
    faqs: []
  }
];

export default function PdfCategory() {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState([]);

  const activeTool = PDF_TOOLS.find(t => t.id === toolId) || null;

  const setActiveTool = (tool) => {
    if (tool) {
      navigate(`/pdf/${tool.id}`);
    } else {
      navigate('/pdf');
    }
  };

  // Handle files selection from FileUpload component
  const handleFilesSelected = (files) => {
    setSelectedFiles(files);
    console.log(`[Upload System Log] Selected files in ${activeTool?.title}:`, files);
  };

  const handleBackToCatalog = () => {
    navigate('/pdf');
    setSelectedFiles([]);
  };

  // If a specific tool is launched, render it inside ToolLayout
  if (activeTool) {
    const Breadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'PDF Tools', href: '/pdf' },
      { label: activeTool.title }
    ];

    const related = PDF_TOOLS.filter((t) => t.id !== activeTool.id).map((t) => ({
      id: t.id,
      title: t.title,
      desc: t.desc,
      href: `/pdf/${t.id}`
    }));

    let WorkspaceComponent = null;
    if (activeTool.id === 'pdf-merge') {
      WorkspaceComponent = <PdfMergeWorkspace onBack={handleBackToCatalog} />;
    } else if (activeTool.id === 'pdf-split') {
      WorkspaceComponent = <PdfSplitWorkspace onBack={handleBackToCatalog} />;
    } else if (activeTool.id === 'pdf-compress') {
      WorkspaceComponent = <PdfCompressWorkspace onBack={handleBackToCatalog} />;
    } else if (activeTool.id === 'pdf-rotate') {
      WorkspaceComponent = <PdfRotateWorkspace onBack={handleBackToCatalog} />;
    } else if (activeTool.id === 'pdf-delete-pages') {
      WorkspaceComponent = <PdfDeleteWorkspace onBack={handleBackToCatalog} />;
    } else if (activeTool.id === 'pdf-extract-pages') {
      WorkspaceComponent = <PdfExtractWorkspace onBack={handleBackToCatalog} />;
    }

    return (
      <>
        <SEO 
          title={`${activeTool.title} - Free Online PDF Tool`}
          description={activeTool.desc}
          canonicalUrl={`${window.location.origin}/pdf/${activeTool.id}`}
          jsonLdSchema={{
            "@graph": [
              {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  { "@type": "ListItem", "position": 1, "name": "Home", "item": `${window.location.origin}/` },
                  { "@type": "ListItem", "position": 2, "name": "PDF Tools", "item": `${window.location.origin}/pdf` },
                  { "@type": "ListItem", "position": 3, "name": activeTool.title, "item": `${window.location.origin}/pdf/${activeTool.id}` }
                ]
              },
              {
                "@type": "WebApplication",
                "name": activeTool.title,
                "description": activeTool.desc,
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "All",
                "browserRequirements": "Requires HTML5"
              }
            ]
          }}
        />
        <ToolLayout
          title={activeTool.title}
          description={activeTool.desc}
          badge={activeTool.badge}
          breadcrumbs={Breadcrumbs}
          instructions={activeTool.instructions}
          faqs={activeTool.faqs || []}
          relatedTools={related}
        >
          {WorkspaceComponent}
        </ToolLayout>
      </>
    );
  }

  // Render Category catalog view
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <SEO 
        title="PDF Document Tools - Secure Local Processing"
        description="Split, merge, compress, rotate, and delete pages from PDF files. All processing happens locally in your browser cache with no file uploads."
        canonicalUrl={`${window.location.origin}/pdf`}
        jsonLdSchema={{
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": `${window.location.origin}/` },
            { "@type": "ListItem", "position": 2, "name": "PDF Tools", "item": `${window.location.origin}/pdf` }
          ]
        }}
      />
      <header className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-black tracking-tight mb-2 text-slate-900 dark:text-slate-100">PDF Document Tools</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">
          Manipulate, merge, split, compress, and unlock PDF files locally inside your browser cache.
        </p>
      </header>

      {/* Grid listing all PDF tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {PDF_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              onClick={() => setActiveTool(tool)}
              className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl hover:border-violet-500/60 dark:hover:border-violet-500/40 transition duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-violet-600 group-hover:text-white transition-colors duration-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  {tool.badge && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30">
                      {tool.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {tool.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
