const mongoose = require('mongoose');

const landPlotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a plot name'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Please add the plot location'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  totalTrees: {
    type: Number,
    required: [true, 'Please add the total number of trees in the plot'],
    min: [1, 'Plot must have at least 1 tree']
  },
  adoptedTrees: {
    type: Number,
    default: 0,
    min: [0, 'Adopted trees cannot be negative']
  },
  adoptionPrice: {
    type: Number,
    required: [true, 'Please add the adoption price per tree']
  },
  images: [{
    type: String,
    required: [true, 'Please add at least one image']
  }],
  benefits: [String],
  
  // Plot characteristics
  plotSize: {
    type: String,
    required: [true, 'Please add the plot size']
  },
  soilType: {
    type: String,
    required: [true, 'Please add the soil type']
  },
  climate: {
    type: String,
    required: [true, 'Please add the climate information']
  },
  
  // Management
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please specify the farmer']
  },
  
  status: {
    type: String,
    enum: ['Available', 'Fully Adopted', 'Maintenance'],
    default: 'Available'
  },
  
  // Adoption tracking
  adoptions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    treeNumber: {
      type: Number,
      required: true
    },
    adoptedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['Active', 'Expired', 'Cancelled'],
      default: 'Active'
    }
  }],
  
  // Environmental impact
  estimatedCO2Absorption: {
    type: String,
    required: [true, 'Please add estimated CO2 absorption']
  },
  
  // Updates and maintenance
  updates: [{
    date: {
      type: Date,
      default: Date.now
    },
    title: String,
    content: String,
    image: String,
    type: {
      type: String,
      enum: ['Growth', 'Maintenance', 'Harvest', 'General'],
      default: 'General'
    }
  }],
  
  // NFT and blockchain
  nftContractAddress: {
    type: String
  },
  metadataURI: {
    type: String
  }
}, {
  timestamps: true
});

// Virtual for available trees
landPlotSchema.virtual('availableTrees').get(function() {
  return this.totalTrees - this.adoptedTrees;
});

// Virtual for adoption progress percentage
landPlotSchema.virtual('adoptionProgress').get(function() {
  return Math.round((this.adoptedTrees / this.totalTrees) * 100);
});

// Ensure virtual fields are serialized
landPlotSchema.set('toJSON', { virtuals: true });
landPlotSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LandPlot', landPlotSchema);
