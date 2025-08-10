import Handlebars from "handlebars";
import moment from "moment";
import { TemplateRepository } from "../../repositories/TemplateRepository";
import { Logger } from "../../utils/Logger";
import { Template } from "@/models/Template";

export interface RenderedTemplate {
  subject: string;
  content: string;
  variables: string[];
}

export class TemplateService {
  private handlebars: typeof Handlebars;
  private templateRepo: TemplateRepository;
  private logger: Logger;
  private templateCache: Map<string, Template> = new Map();

  constructor() {
    this.handlebars = Handlebars;
    this.templateRepo = new TemplateRepository();
    this.logger = Logger.getInstance();
    this.registerHelpers();
  }

  async render(
    templateName: string,
    data: Record<string, any>
  ): Promise<RenderedTemplate> {
    try {
      const template = await this.getTemplate(templateName);
      if (!template) {
        throw new Error(`Template ${templateName} not found`);
      }

      // Validate required variables
      this.validateTemplateData(template, data);

      const compiledSubject = this.handlebars.compile(template.subject);
      const compiledBody = this.handlebars.compile(template.body);

      const rendered = {
        subject: compiledSubject(data),
        content: compiledBody(data),
        variables: template.variables,
      };

      this.logger.info(`Template rendered successfully: ${templateName}`);
      return rendered;
    } catch (error) {
      this.logger.error(
        `Failed to render template: ${templateName}`,
        error as Error
      );
      throw error;
    }
  }

  async getTemplate(name: string): Promise<Template | null> {
    // Check cache first
    if (this.templateCache.has(name)) {
      return this.templateCache.get(name)!;
    }

    // Fetch from database
    const template = await this.templateRepo.findByName(name);
    if (template) {
      this.templateCache.set(name, template);
    }

    return template;
  }

  async invalidateCache(templateName?: string): Promise<void> {
    if (templateName) {
      this.templateCache.delete(templateName);
    } else {
      this.templateCache.clear();
    }
    this.logger.info("Template cache invalidated", { templateName });
  }

  private validateTemplateData(
    template: Template,
    data: Record<string, any>
  ): void {
    const missingVariables = template.variables.filter(
      (variable) =>
        !(variable in data) ||
        data[variable] === undefined ||
        data[variable] === null
    );

    if (missingVariables.length > 0) {
      throw new Error(
        `Missing required template variables: ${missingVariables.join(", ")}`
      );
    }
  }

  private registerHelpers(): void {
    // Date formatting helper
    this.handlebars.registerHelper(
      "formatDate",
      (date: Date | string, format = "YYYY-MM-DD") => {
        return moment(date).format(format);
      }
    );

    // Currency formatting helper
    this.handlebars.registerHelper(
      "currency",
      (amount: number, currency = "USD") => {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
        }).format(amount);
      }
    );

    // Number formatting helper
    this.handlebars.registerHelper("number", (value: number, decimals = 0) => {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    });

    // Conditional helper
    this.handlebars.registerHelper("if_eq", function (this:any,a, b, options) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Uppercase helper
    this.handlebars.registerHelper("uppercase", (str: string) => {
      return str ? str.toUpperCase() : "";
    });

    // Lowercase helper
    this.handlebars.registerHelper("lowercase", (str: string) => {
      return str ? str.toLowerCase() : "";
    });

    // Truncate helper
    this.handlebars.registerHelper("truncate", (str: string, length = 100) => {
      if (!str || str.length <= length) return str;
      return str.substring(0, length) + "...";
    });

    this.logger.info("Handlebars helpers registered");
  }
}
