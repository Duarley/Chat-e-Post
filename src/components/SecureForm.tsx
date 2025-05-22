"use client"

import type React from "react"

import { useState, type FormEvent } from "react"
import { sanitizeInput, validateFileType, validateFileSize } from "../utils/security"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle } from "lucide-react"

interface SecureFormProps {
  onSubmit: (data: Record<string, any>) => Promise<void>
  fields: {
    name: string
    type: "text" | "email" | "password" | "textarea" | "file"
    label: string
    required?: boolean
    validation?: RegExp
    errorMessage?: string
    allowedFileTypes?: string[]
    maxFileSizeMB?: number
  }[]
  submitLabel: string
}

export default function SecureForm({ onSubmit, fields, submitLabel }: SecureFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Sanitize input to prevent XSS
    const sanitizedValue = sanitizeInput(value)

    setFormData({
      ...formData,
      [name]: sanitizedValue,
    })

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target
    if (!files || files.length === 0) return

    const file = files[0]
    const field = fields.find((f) => f.name === name)

    if (field?.allowedFileTypes && !validateFileType(file, field.allowedFileTypes)) {
      setErrors({
        ...errors,
        [name]: `Invalid file type. Allowed types: ${field.allowedFileTypes.join(", ")}`,
      })
      return
    }

    if (field?.maxFileSizeMB && !validateFileSize(file, field.maxFileSizeMB)) {
      setErrors({
        ...errors,
        [name]: `File too large. Maximum size: ${field.maxFileSizeMB}MB`,
      })
      return
    }

    setFormData({
      ...formData,
      [name]: file,
    })

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    let isValid = true

    fields.forEach((field) => {
      const value = formData[field.name]

      // Check required fields
      if (field.required && (!value || (typeof value === "string" && value.trim() === ""))) {
        newErrors[field.name] = `${field.label} is required`
        isValid = false
      }

      // Check regex validation
      if (value && field.validation && typeof value === "string" && !field.validation.test(value)) {
        newErrors[field.name] = field.errorMessage || `Invalid ${field.label}`
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      await onSubmit(formData)

      // Clear form after successful submission
      setFormData({})

      toast({
        title: "Success",
        description: "Form submitted successfully",
      })
    } catch (error) {
      console.error("Form submission error:", error)

      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while submitting the form",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <label htmlFor={field.name} className="block text-sm font-medium">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>

          {field.type === "textarea" ? (
            <Textarea
              id={field.name}
              name={field.name}
              value={formData[field.name] || ""}
              onChange={handleInputChange}
              className={errors[field.name] ? "border-red-500" : ""}
              disabled={isSubmitting}
            />
          ) : field.type === "file" ? (
            <Input
              id={field.name}
              name={field.name}
              type="file"
              onChange={handleFileChange}
              className={errors[field.name] ? "border-red-500" : ""}
              disabled={isSubmitting}
              accept={field.allowedFileTypes?.join(",")}
            />
          ) : (
            <Input
              id={field.name}
              name={field.name}
              type={field.type}
              value={formData[field.name] || ""}
              onChange={handleInputChange}
              className={errors[field.name] ? "border-red-500" : ""}
              disabled={isSubmitting}
              autoComplete={field.type === "password" ? "new-password" : undefined}
            />
          )}

          {errors[field.name] && (
            <div className="flex items-center text-red-500 text-sm mt-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors[field.name]}
            </div>
          )}
        </div>
      ))}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Submitting..." : submitLabel}
      </Button>
    </form>
  )
}
