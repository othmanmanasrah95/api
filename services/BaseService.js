// Base service class for common CRUD operations
class BaseService {
  constructor(model) {
    this.model = model;
  }

  // Create a new document
  async create(data) {
    try {
      const document = new this.model(data);
      return await document.save();
    } catch (error) {
      throw new Error(`Failed to create ${this.model.modelName}: ${error.message}`);
    }
  }

  // Find document by ID
  async findById(id, populate = []) {
    try {
      let query = this.model.findById(id);
      
      if (populate.length > 0) {
        populate.forEach(field => {
          query = query.populate(field);
        });
      }
      
      const document = await query;
      if (!document) {
        throw new Error(`${this.model.modelName} not found`);
      }
      return document;
    } catch (error) {
      throw new Error(`Failed to find ${this.model.modelName}: ${error.message}`);
    }
  }

  // Find all documents with pagination and filtering
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = { createdAt: -1 },
        filter = {},
        populate = []
      } = options;

      const skip = (page - 1) * limit;
      
      let query = this.model.find(filter);
      
      if (populate.length > 0) {
        populate.forEach(field => {
          query = query.populate(field);
        });
      }
      
      const documents = await query
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      const total = await this.model.countDocuments(filter);
      
      return {
        data: documents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to find ${this.model.modelName}s: ${error.message}`);
    }
  }

  // Update document by ID
  async updateById(id, data) {
    try {
      const document = await this.model.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
      );
      
      if (!document) {
        throw new Error(`${this.model.modelName} not found`);
      }
      
      return document;
    } catch (error) {
      throw new Error(`Failed to update ${this.model.modelName}: ${error.message}`);
    }
  }

  // Delete document by ID
  async deleteById(id) {
    try {
      const document = await this.model.findByIdAndDelete(id);
      
      if (!document) {
        throw new Error(`${this.model.modelName} not found`);
      }
      
      return document;
    } catch (error) {
      throw new Error(`Failed to delete ${this.model.modelName}: ${error.message}`);
    }
  }

  // Find documents by filter
  async findByFilter(filter, options = {}) {
    try {
      const {
        sort = { createdAt: -1 },
        populate = [],
        limit
      } = options;

      let query = this.model.find(filter);
      
      if (populate.length > 0) {
        populate.forEach(field => {
          query = query.populate(field);
        });
      }
      
      query = query.sort(sort);
      
      if (limit) {
        query = query.limit(limit);
      }
      
      return await query;
    } catch (error) {
      throw new Error(`Failed to find ${this.model.modelName}s: ${error.message}`);
    }
  }

  // Count documents by filter
  async count(filter = {}) {
    try {
      return await this.model.countDocuments(filter);
    } catch (error) {
      throw new Error(`Failed to count ${this.model.modelName}s: ${error.message}`);
    }
  }

  // Check if document exists
  async exists(filter) {
    try {
      return await this.model.exists(filter);
    } catch (error) {
      throw new Error(`Failed to check ${this.model.modelName} existence: ${error.message}`);
    }
  }
}

module.exports = BaseService;
