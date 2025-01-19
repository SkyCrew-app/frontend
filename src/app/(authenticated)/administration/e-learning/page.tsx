'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {CourseManagement} from "@/components/e-learning/CourseManagement";
import {ModuleManagement} from "@/components/e-learning/ModuleManagement";
import {LessonManagement} from "@/components/e-learning/LessonManagement";
import {EvaluationManagement} from "@/components/evaluation/EvaluationManagement";
import { BookOpen, Layers, FileText, ClipboardList } from 'lucide-react';

export default function AdminELearningPage() {
  const [activeTab, setActiveTab] = useState("courses");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">Administration E-Learning</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 gap-4">
            <TabsTrigger value="courses" className="flex items-center justify-center">
              <BookOpen className="w-5 h-5 mr-2" />
              Cours
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center justify-center">
              <Layers className="w-5 h-5 mr-2" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="lessons" className="flex items-center justify-center">
              <FileText className="w-5 h-5 mr-2" />
              Leçons
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="flex items-center justify-center">
              <ClipboardList className="w-5 h-5 mr-2" />
              Évaluations
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="courses" className="space-y-8">
            <CourseManagement />
          </TabsContent>
          
          <TabsContent value="modules" className="space-y-8">
            <ModuleManagement />
          </TabsContent>
          
          <TabsContent value="lessons" className="space-y-8">
            <LessonManagement />
          </TabsContent>
          
          <TabsContent value="evaluations" className="space-y-8">
            <EvaluationManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

