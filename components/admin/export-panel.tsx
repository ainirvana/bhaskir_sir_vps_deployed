"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Presentation, Download, Folder } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { generatePresentationData } from "@/app/actions/export-actions"

interface ExportPanelProps {
  directories: Array<{
    id: string
    name: string
    description: string
    slide_count: number
    is_published: boolean
  }>
}

export default function ExportPanel({ directories }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportingId, setExportingId] = useState<string>("")

  const handleExport = async (directoryId: string, format: "pdf" | "pptx") => {
    setIsExporting(true)
    setExportingId(directoryId)

    try {
      const result = await generatePresentationData(directoryId)
      // Add type guards for API response
      if ('data' in result) {
        const content = format === "pdf" ? generatePDFContent(result.data) : generatePPTXContent(result.data)
        const filename = `${result.data.title}-${format}.html`

        downloadFile(content, filename, "text/html")

        toast({
          title: "Export successful!",
          description: `Directory exported as ${format.toUpperCase()}-ready HTML`,
        })
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
      setExportingId("")
    }
  }

  const generatePDFContent = (data: any) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${data.title}</title>
    <style>
        @page { size: A4; margin: 1in; }
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .slide { page-break-after: always; margin-bottom: 2em; }
        .slide:last-child { page-break-after: avoid; }
        .slide-title { font-size: 24px; font-weight: bold; margin-bottom: 1em; color: #333; }
        .slide-content { font-size: 14px; white-space: pre-wrap; }
        .slide-image { max-width: 100%; height: auto; margin: 1em 0; }
        .cover { text-align: center; padding: 2em; }
        .cover h1 { font-size: 36px; margin-bottom: 0.5em; }
        .cover p { font-size: 18px; color: #666; }
        @media print {
            .slide { page-break-after: always; }
        }
    </style>
</head>
<body>
    <div class="slide cover">
        <h1>${data.title}</h1>
        <p>${data.description || ""}</p>
        <p>Total Slides: ${data.totalSlides}</p>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
    </div>
    
    ${data.slides
      .map(
        (slide: any) => `
    <div class="slide">
        <h2 class="slide-title">${slide.title}</h2>
        ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="${slide.title}" class="slide-image" />` : ""}
        <div class="slide-content">${slide.content}</div>
    </div>
    `,
      )
      .join("")}
</body>
</html>
    `
  }

  const generatePPTXContent = (data: any) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${data.title} - PowerPoint Compatible</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; }
        .presentation { max-width: 1024px; margin: 0 auto; }
        .slide { 
            width: 100%; 
            min-height: 600px; 
            border: 2px solid #ddd; 
            margin-bottom: 30px; 
            padding: 40px; 
            background: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .slide-title { 
            font-size: 32px; 
            font-weight: bold; 
            margin-bottom: 30px; 
            color: #1f4e79;
            border-bottom: 3px solid #1f4e79;
            padding-bottom: 10px;
        }
        .slide-content { 
            font-size: 18px; 
            line-height: 1.8; 
            white-space: pre-wrap; 
        }
        .slide-image { 
            max-width: 80%; 
            height: auto; 
            margin: 20px auto; 
            display: block;
            border-radius: 8px;
        }
        .cover { 
            text-align: center; 
            background: linear-gradient(135deg, #1f4e79 0%, #4472c4 100%);
            color: white;
        }
        .cover h1 { 
            font-size: 48px; 
            margin-bottom: 20px; 
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .cover p { 
            font-size: 24px; 
            margin-bottom: 15px; 
        }
    </style>
</head>
<body>
    <div class="presentation">
        <div class="slide cover">
            <h1>${data.title}</h1>
            <p>${data.description || ""}</p>
            <p>Total Slides: ${data.totalSlides}</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        ${data.slides
          .map(
            (slide: any) => `
        <div class="slide">
            <h2 class="slide-title">${slide.title}</h2>
            ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="${slide.title}" class="slide-image" />` : ""}
            <div class="slide-content">${slide.content}</div>
        </div>
        `,
          )
          .join("")}
    </div>
</body>
</html>
    `
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const publishedDirectories = directories.filter((dir) => dir.is_published && dir.slide_count > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Download className="w-5 h-5 mr-2" />
          Export Presentations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {publishedDirectories.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No directories available for export. Create and publish directories with slides first.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Export your slide directories as PDF or PowerPoint-compatible presentations.
            </p>

            {publishedDirectories.map((directory) => (
              <div key={directory.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Folder className="w-5 h-5 text-blue-500" />
                  <div>
                    <h4 className="font-medium">{directory.name}</h4>
                    <p className="text-sm text-gray-500">{directory.description}</p>
                  </div>
                  <Badge variant="outline">{directory.slide_count} slides</Badge>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport(directory.id, "pdf")}
                    disabled={isExporting && exportingId === directory.id}
                    className="bg-red-50 hover:bg-red-100 border-red-200"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    {isExporting && exportingId === directory.id ? "Exporting..." : "PDF"}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport(directory.id, "pptx")}
                    disabled={isExporting && exportingId === directory.id}
                    className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                  >
                    <Presentation className="w-4 h-4 mr-1" />
                    {isExporting && exportingId === directory.id ? "Exporting..." : "PPTX"}
                  </Button>
                </div>
              </div>
            ))}

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2">Export Instructions:</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • <strong>PDF:</strong> Download HTML file, then print to PDF in your browser
                </li>
                <li>
                  • <strong>PPTX:</strong> Download HTML file, open in browser, then copy content to PowerPoint
                </li>
                <li>• Files include cover slide with directory information</li>
                <li>• All images and formatting are preserved</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
