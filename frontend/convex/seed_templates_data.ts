export const DEFAULT_TEMPLATES = [
    {
        "name": "1 HR 8' Interior Wall",
        "description": "Complete assembly for 1-hour rated wall: drywall, studs, tracks, insulation, and labor.",
        "is_active": true,
        "category": "Drywall & Carpentry",
        "template_data": {
            "id": "03697163-be41-4554-9a5b-289bfb02dcf6",
            "toolType": "linear",
            "properties": {
                "name": "1 HR 8' Interior Wall",
                "unit": "ft",
                "color": "#3b82f6",
                "group": "Drywall & Carpentry",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "3c2025d6-29f2-4b34-a5a5-064a38843008",
                        "name": "Labor per SF",
                        "unit": "sq ft",
                        "unitPrice": 1.25,
                        "quantityFormula": "(qty * [wall_height]) * [sides]"
                    },
                    {
                        "id": "21c70f19-19a5-439d-a2b2-e4398a3ababe",
                        "name": "4x8 Drywall Sheets",
                        "unit": "ea",
                        "unitPrice": 13,
                        "quantityFormula": "roundup(roundup([Labor_per_SF] / 32) * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "21c70f19-19a5-439d-a2b2-e4398a3ababc",
                        "name": "10ft Tracks",
                        "unit": "ea",
                        "unitPrice": 16,
                        "quantityFormula": "roundup((qty * 2) / 10)"
                    },
                    {
                        "id": "57e8a65a-6636-41cc-bc24-c67840867f6e",
                        "name": "10ft Studs",
                        "unit": "ea",
                        "unitPrice": 16,
                        "quantityFormula": "roundup(qty / [stud_spacing])"
                    },
                    {
                        "id": "5f0d7c17-8d54-4315-b9b5-c4af238f13f7",
                        "name": "Screws (1000) Box",
                        "unit": "ea",
                        "unitPrice": 25,
                        "quantityFormula": "roundup(([4x8_Drywall_Sheets] * 36) / 1000)"
                    },
                    {
                        "id": "d52808bd-264c-48b6-9750-598e903b393b",
                        "name": "Joint Tape",
                        "unit": "rolls",
                        "unitPrice": 3.5,
                        "quantityFormula": "roundup([4x8_Drywall_Sheets] / 40)"
                    },
                    {
                        "id": "a23d3be8-80c0-476a-8ad0-b3e91b3c3ba0",
                        "name": "Compound Bucket",
                        "unit": "ea",
                        "unitPrice": 22,
                        "quantityFormula": "roundup(qty / 256)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "wall_height",
                        "unit": "ft",
                        "value": 10
                    },
                    {
                        "id": "var-001",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 10
                    },
                    {
                        "id": "var-002",
                        "name": "sides",
                        "unit": "",
                        "value": 1
                    },
                    {
                        "id": "var-003",
                        "name": "stud_spacing",
                        "unit": "ft",
                        "value": 1.33
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Mass Excavation (Basement)",
        "description": "Calculates bank and loose cubic yards, truck loads, and disposal fees.",
        "is_active": true,
        "category": "Earthwork",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111111",
            "toolType": "area",
            "properties": {
                "name": "Mass Excavation (Basement)",
                "unit": "ft²",
                "color": "#854d0e",
                "group": "Earthwork",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-earth-01-a",
                        "name": "Bank Cubic Yards",
                        "unit": "cy",
                        "unitPrice": 4.5,
                        "quantityFormula": "round((qty * [avg_depth_ft]) / 27)"
                    },
                    {
                        "id": "sub-earth-01-b",
                        "name": "Loose Cubic Yards",
                        "unit": "cy",
                        "unitPrice": 0,
                        "quantityFormula": "round([Bank_Cubic_Yards] * (([swell_percent] / 100) + 1))"
                    },
                    {
                        "id": "sub-earth-01-c",
                        "name": "Haul Off Trucks",
                        "unit": "load",
                        "unitPrice": 180,
                        "quantityFormula": "roundup([Loose_Cubic_Yards] / [truck_capacity_cy])"
                    },
                    {
                        "id": "sub-earth-01-d",
                        "name": "Disposal Fee",
                        "unit": "load",
                        "unitPrice": 65,
                        "quantityFormula": "[Haul_Off_Trucks]"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "avg_depth_ft",
                        "unit": "ft",
                        "value": 8
                    },
                    {
                        "id": "var-001",
                        "name": "swell_percent",
                        "unit": "%",
                        "value": 20
                    },
                    {
                        "id": "var-002",
                        "name": "truck_capacity_cy",
                        "unit": "cy",
                        "value": 18
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Rectangular Duct 24x12",
        "description": "Calculates sheet metal area, insulation wrap, hangers, and sealant.",
        "is_active": true,
        "category": "HVAC",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111112",
            "toolType": "linear",
            "properties": {
                "name": "Rectangular Duct 24x12",
                "unit": "ft",
                "color": "#60a5fa",
                "group": "HVAC",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-hvac-01-a",
                        "name": "Sheet Metal Area",
                        "unit": "sq ft",
                        "unitPrice": 4.25,
                        "quantityFormula": "roundup((qty * ((([duct_width_in] + [duct_height_in]) * 2) / 12)) * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "sub-hvac-01-b",
                        "name": "Duct Insulation Wrap",
                        "unit": "sq ft",
                        "unitPrice": 1.15,
                        "quantityFormula": "[Sheet_Metal_Area]"
                    },
                    {
                        "id": "sub-hvac-01-c",
                        "name": "Unistrut Hangers",
                        "unit": "ea",
                        "unitPrice": 18.5,
                        "quantityFormula": "roundup(qty / [hanger_spacing])"
                    },
                    {
                        "id": "sub-hvac-01-d",
                        "name": "Joint Sealant",
                        "unit": "tube",
                        "unitPrice": 9,
                        "quantityFormula": "roundup(qty / 40)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "duct_width_in",
                        "unit": "in",
                        "value": 24
                    },
                    {
                        "id": "var-001",
                        "name": "duct_height_in",
                        "unit": "in",
                        "value": 12
                    },
                    {
                        "id": "var-002",
                        "name": "hanger_spacing",
                        "unit": "ft",
                        "value": 8
                    },
                    {
                        "id": "var-003",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 10
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "4\" PVC San. Sewer Line",
        "description": "Calculates PVC pipe, bedding gravel, couplings, and primer/glue.",
        "is_active": true,
        "category": "Plumbing",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111113",
            "toolType": "linear",
            "properties": {
                "name": "4\" PVC San. Sewer Line",
                "unit": "ft",
                "color": "#10b981",
                "group": "Plumbing",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-plumb-01-a",
                        "name": "4in PVC Pipe",
                        "unit": "ft",
                        "unitPrice": 3.85,
                        "quantityFormula": "roundup(qty * 1.05)"
                    },
                    {
                        "id": "sub-plumb-01-b",
                        "name": "Pipe Bedding Gravel",
                        "unit": "ton",
                        "unitPrice": 35,
                        "quantityFormula": "roundup((qty * 1.5 * [trench_depth]) / 27 * 1.4)"
                    },
                    {
                        "id": "sub-plumb-01-c",
                        "name": "Couplings",
                        "unit": "ea",
                        "unitPrice": 4.5,
                        "quantityFormula": "roundup(qty / [coupling_freq])"
                    },
                    {
                        "id": "sub-plumb-01-d",
                        "name": "Primer and Glue",
                        "unit": "set",
                        "unitPrice": 22,
                        "quantityFormula": "roundup(qty / 200)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-001",
                        "name": "coupling_freq",
                        "unit": "ft",
                        "value": 20
                    },
                    {
                        "id": "var-002",
                        "name": "trench_depth",
                        "unit": "ft",
                        "value": 3
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Commercial TPO Flat Roof",
        "description": "Calculates TPO membrane, insulation sheets, fasteners, and adhesive.",
        "is_active": true,
        "category": "Roofing",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111114",
            "toolType": "area",
            "properties": {
                "name": "Commercial TPO Flat Roof",
                "unit": "ft²",
                "color": "#cbd5e1",
                "group": "Roofing",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-roof-02-a",
                        "name": "TPO Membrane",
                        "unit": "sq ft",
                        "unitPrice": 0.85,
                        "quantityFormula": "qty * (([waste_factor] / 100) + 1)"
                    },
                    {
                        "id": "sub-roof-02-b",
                        "name": "ISO Insulation 4x8",
                        "unit": "sheets",
                        "unitPrice": 42,
                        "quantityFormula": "roundup((qty / 32) * [insulation_layers])"
                    },
                    {
                        "id": "sub-roof-02-c",
                        "name": "Insulation Fasteners",
                        "unit": "box",
                        "unitPrice": 55,
                        "quantityFormula": "roundup(([ISO_Insulation_4x8] * 8) / 1000)"
                    },
                    {
                        "id": "sub-roof-02-d",
                        "name": "Bonding Adhesive",
                        "unit": "bucket",
                        "unitPrice": 140,
                        "quantityFormula": "roundup(qty / [adhesive_cov] / 5)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "insulation_layers",
                        "unit": "",
                        "value": 2
                    },
                    {
                        "id": "var-001",
                        "name": "adhesive_cov",
                        "unit": "sq ft",
                        "value": 60
                    },
                    {
                        "id": "var-002",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 8
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Asphalt Paving (Parking)",
        "description": "Calculates fine grade labor, stone base, hot mix asphalt, and striping.",
        "is_active": true,
        "category": "Site Work",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111115",
            "toolType": "area",
            "properties": {
                "name": "Asphalt Paving (Parking)",
                "unit": "ft²",
                "color": "#1e293b",
                "group": "Site Work",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-site-01-a",
                        "name": "Fine Grade labor",
                        "unit": "sq ft",
                        "unitPrice": 0.35,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "sub-site-01-b",
                        "name": "Agg Base Stone",
                        "unit": "ton",
                        "unitPrice": 28,
                        "quantityFormula": "round(((qty * ([base_depth_in] / 12)) / 27) * 2)"
                    },
                    {
                        "id": "sub-site-01-c",
                        "name": "Hot Mix Asphalt",
                        "unit": "ton",
                        "unitPrice": 95,
                        "quantityFormula": "round((qty * ([asphalt_depth_in] / 12) * [asphalt_density]) / 2000)"
                    },
                    {
                        "id": "sub-site-01-d",
                        "name": "Striping Paint",
                        "unit": "gal",
                        "unitPrice": 45,
                        "quantityFormula": "roundup(qty / 400)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "base_depth_in",
                        "unit": "in",
                        "value": 6
                    },
                    {
                        "id": "var-001",
                        "name": "asphalt_depth_in",
                        "unit": "in",
                        "value": 3
                    },
                    {
                        "id": "var-002",
                        "name": "asphalt_density",
                        "unit": "lb/cf",
                        "value": 145
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Ext Wall Insulation",
        "description": "Calculates net wall area, batts, vapor barrier, and staples.",
        "is_active": true,
        "category": "Insulation",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111116",
            "toolType": "linear",
            "properties": {
                "name": "Ext Wall Insulation",
                "unit": "ft",
                "color": "#fcd34d",
                "group": "Insulation",
                "formula": "qty * [wall_height]",
                "subItems": [
                    {
                        "id": "sub-insul-01-a",
                        "name": "Net Wall Area",
                        "unit": "sq ft",
                        "unitPrice": 0,
                        "quantityFormula": "qty * [wall_height]"
                    },
                    {
                        "id": "sub-insul-01-b",
                        "name": "R-19 Batts",
                        "unit": "bag",
                        "unitPrice": 65,
                        "quantityFormula": "roundup([Net_Wall_Area] / [bag_coverage])"
                    },
                    {
                        "id": "sub-insul-01-c",
                        "name": "Vapor Barrier (6mil)",
                        "unit": "rolls",
                        "unitPrice": 80,
                        "quantityFormula": "roundup([Net_Wall_Area] / 1000)"
                    },
                    {
                        "id": "sub-insul-01-d",
                        "name": "Staples Box",
                        "unit": "ea",
                        "unitPrice": 12,
                        "quantityFormula": "roundup([Net_Wall_Area] / 2000)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "wall_height",
                        "unit": "ft",
                        "value": 9
                    },
                    {
                        "id": "var-001",
                        "name": "stud_spacing",
                        "unit": "in",
                        "value": 16
                    },
                    {
                        "id": "var-002",
                        "name": "bag_coverage",
                        "unit": "sq ft",
                        "value": 80
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "3/4\" EMT Run (3-Wire TWHN)",
        "description": "Calculates conduit, wire, couplings, straps, and labor hours.",
        "is_active": true,
        "category": "Electrical",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111117",
            "toolType": "linear",
            "properties": {
                "name": "3/4\" EMT Run (3-Wire TWHN)",
                "unit": "ft",
                "color": "#facc15",
                "group": "Electrical",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-elec-chain-01-a",
                        "name": "Total Conduit Feet",
                        "unit": "ft",
                        "unitPrice": 0.85,
                        "quantityFormula": "roundup(qty * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "sub-elec-chain-01-b",
                        "name": "Total Wire Feet",
                        "unit": "ft",
                        "unitPrice": 0.22,
                        "quantityFormula": "roundup([Total_Conduit_Feet] * [num_conductors] * 1.05)"
                    },
                    {
                        "id": "sub-elec-chain-01-c",
                        "name": "Couplings Compression",
                        "unit": "ea",
                        "unitPrice": 1.15,
                        "quantityFormula": "roundup([Total_Conduit_Feet] / 10)"
                    },
                    {
                        "id": "sub-elec-chain-01-d",
                        "name": "One Hole Straps",
                        "unit": "ea",
                        "unitPrice": 0.45,
                        "quantityFormula": "roundup([Total_Conduit_Feet] / [support_spacing])"
                    },
                    {
                        "id": "sub-elec-chain-01-e",
                        "name": "Labor Hours",
                        "unit": "hrs",
                        "unitPrice": 85,
                        "quantityFormula": "round(([Total_Conduit_Feet] / 100) * 4)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "num_conductors",
                        "unit": "",
                        "value": 3
                    },
                    {
                        "id": "var-001",
                        "name": "support_spacing",
                        "unit": "ft",
                        "value": 10
                    },
                    {
                        "id": "var-002",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 10
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Cat6 Data Drops (Home Run)",
        "description": "Calculates cable length, spools, J-hooks, and RJ45 jacks.",
        "is_active": true,
        "category": "Electrical",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111118",
            "toolType": "count",
            "properties": {
                "name": "Cat6 Data Drops (Home Run)",
                "unit": "ea",
                "color": "#3b82f6",
                "group": "Electrical - Low Voltage",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-elec-chain-02-a",
                        "name": "Total Cable Length",
                        "unit": "ft",
                        "unitPrice": 0,
                        "quantityFormula": "roundup((qty * [avg_run_length] * [cables_per_drop]) * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "sub-elec-chain-02-b",
                        "name": "1000ft Spools",
                        "unit": "box",
                        "unitPrice": 185,
                        "quantityFormula": "roundup([Total_Cable_Length] / 1000)"
                    },
                    {
                        "id": "sub-elec-chain-02-c",
                        "name": "J-Hooks (Support)",
                        "unit": "ea",
                        "unitPrice": 2.5,
                        "quantityFormula": "roundup([Total_Cable_Length] / 5 / [cables_per_drop])"
                    },
                    {
                        "id": "sub-elec-chain-02-d",
                        "name": "RJ45 Jacks",
                        "unit": "ea",
                        "unitPrice": 3.25,
                        "quantityFormula": "qty * [cables_per_drop] * 2"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "avg_run_length",
                        "unit": "ft",
                        "value": 150
                    },
                    {
                        "id": "var-001",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 15
                    },
                    {
                        "id": "var-002",
                        "name": "cables_per_drop",
                        "unit": "",
                        "value": 2
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Underground Feeder (PVC)",
        "description": "Calculates excavation, sand bedding, PVC conduit, feeder wire, and warning tape.",
        "is_active": true,
        "category": "Electrical",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111119",
            "toolType": "linear",
            "properties": {
                "name": "Underground Feeder (PVC)",
                "unit": "ft",
                "color": "#a855f7",
                "group": "Electrical - Site",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-elec-chain-03-a",
                        "name": "Excavation CY",
                        "unit": "cy",
                        "unitPrice": 45,
                        "quantityFormula": "roundup((qty * ([trench_width_in] / 12) * ([trench_depth_in] / 12)) / 27)"
                    },
                    {
                        "id": "sub-elec-chain-03-b",
                        "name": "Sand Bedding Tons",
                        "unit": "ton",
                        "unitPrice": 35,
                        "quantityFormula": "roundup([Excavation_CY] * 0.5 * 1.5)"
                    },
                    {
                        "id": "sub-elec-chain-03-c",
                        "name": "2in PVC Sched40",
                        "unit": "ft",
                        "unitPrice": 2.1,
                        "quantityFormula": "roundup(qty * 1.05)"
                    },
                    {
                        "id": "sub-elec-chain-03-d",
                        "name": "Feeder Wire 4/0",
                        "unit": "ft",
                        "unitPrice": 4.5,
                        "quantityFormula": "roundup([2in_PVC_Sched40] * [num_conductors] * 1.05)"
                    },
                    {
                        "id": "sub-elec-chain-03-e",
                        "name": "Warning Tape",
                        "unit": "rolls",
                        "unitPrice": 45,
                        "quantityFormula": "roundup(qty / 1000)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "trench_width_in",
                        "unit": "in",
                        "value": 12
                    },
                    {
                        "id": "var-001",
                        "name": "trench_depth_in",
                        "unit": "in",
                        "value": 24
                    },
                    {
                        "id": "var-002",
                        "name": "num_conductors",
                        "unit": "",
                        "value": 4
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "LED High Bay Lighting",
        "description": "Count-based fixture takeoff: fixtures, whips, hangers, and lift rental.",
        "is_active": true,
        "category": "Electrical",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111120",
            "toolType": "count",
            "properties": {
                "name": "LED High Bay Lighting",
                "unit": "ea",
                "color": "#fb923c",
                "group": "Electrical - Lighting",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-elec-chain-04-a",
                        "name": "Fixtures",
                        "unit": "ea",
                        "unitPrice": 145,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "sub-elec-chain-04-b",
                        "name": "MC Cable Whip",
                        "unit": "ft",
                        "unitPrice": 0.75,
                        "quantityFormula": "qty * [whip_length]"
                    },
                    {
                        "id": "sub-elec-chain-04-c",
                        "name": "Aircraft Cable Hangers",
                        "unit": "pair",
                        "unitPrice": 12,
                        "quantityFormula": "[Fixtures]"
                    },
                    {
                        "id": "sub-elec-chain-04-d",
                        "name": "Scissor Lift Rental",
                        "unit": "days",
                        "unitPrice": 350,
                        "quantityFormula": "roundup([Fixtures] / 15)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "whip_length",
                        "unit": "ft",
                        "value": 6
                    },
                    {
                        "id": "var-001",
                        "name": "mounting_height",
                        "unit": "ft",
                        "value": 20
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Galvanized Rectangular Duct (Low Pressure)",
        "description": "Calculates duct surface area, sheet metal lbs, insulation, and hangers.",
        "is_active": true,
        "category": "HVAC",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111121",
            "toolType": "linear",
            "properties": {
                "name": "Galvanized Rectangular Duct (Low Pressure)",
                "unit": "ft",
                "color": "#94a3b8",
                "group": "HVAC - Ductwork",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-hvac-rect-01-a",
                        "name": "Duct Surface Area",
                        "unit": "sq ft",
                        "unitPrice": 0,
                        "quantityFormula": "roundup((qty * ((([width_in] + [height_in]) * 2) / 12)) * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "sub-hvac-rect-01-b",
                        "name": "Sheet Metal Lbs",
                        "unit": "lbs",
                        "unitPrice": 2.1,
                        "quantityFormula": "round([Duct_Surface_Area] * [gauge_weight_lb_sf])"
                    },
                    {
                        "id": "sub-hvac-rect-01-c",
                        "name": "Ext Insulation Wrap",
                        "unit": "rolls",
                        "unitPrice": 85,
                        "quantityFormula": "roundup([Duct_Surface_Area] / 100)"
                    },
                    {
                        "id": "sub-hvac-rect-01-d",
                        "name": "Hanger Strap",
                        "unit": "ft",
                        "unitPrice": 0.45,
                        "quantityFormula": "roundup((qty / [hanger_spacing]) * (([width_in] + [height_in]) / 12) * 2)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "width_in",
                        "unit": "in",
                        "value": 24
                    },
                    {
                        "id": "var-001",
                        "name": "height_in",
                        "unit": "in",
                        "value": 12
                    },
                    {
                        "id": "var-002",
                        "name": "gauge_weight_lb_sf",
                        "unit": "lb/sf",
                        "value": 1.15
                    },
                    {
                        "id": "var-003",
                        "name": "hanger_spacing",
                        "unit": "ft",
                        "value": 8
                    },
                    {
                        "id": "var-004",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 10
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Spiral Duct Run (Round)",
        "description": "Calculates spiral pipe, fittings allowance, couplings, and hangers.",
        "is_active": true,
        "category": "HVAC",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111122",
            "toolType": "linear",
            "properties": {
                "name": "Spiral Duct Run (Round)",
                "unit": "ft",
                "color": "#0ea5e9",
                "group": "HVAC - Ductwork",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-hvac-spiral-01-a",
                        "name": "Spiral Pipe Length",
                        "unit": "ft",
                        "unitPrice": 12.5,
                        "quantityFormula": "roundup(qty)"
                    },
                    {
                        "id": "sub-hvac-spiral-01-b",
                        "name": "Fittings Allowance",
                        "unit": "ea",
                        "unitPrice": 1,
                        "quantityFormula": "[Spiral_Pipe_Length] * ([fitting_percent] / 100) * 12.50"
                    },
                    {
                        "id": "sub-hvac-spiral-01-c",
                        "name": "Spiral Couplings",
                        "unit": "ea",
                        "unitPrice": 8.5,
                        "quantityFormula": "roundup([Spiral_Pipe_Length] / [joint_freq])"
                    },
                    {
                        "id": "sub-hvac-spiral-01-d",
                        "name": "Cable Hangers",
                        "unit": "ea",
                        "unitPrice": 14,
                        "quantityFormula": "roundup([Spiral_Pipe_Length] / 10)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "diameter_in",
                        "unit": "in",
                        "value": 12
                    },
                    {
                        "id": "var-001",
                        "name": "fitting_percent",
                        "unit": "%",
                        "value": 25
                    },
                    {
                        "id": "var-002",
                        "name": "joint_freq",
                        "unit": "ft",
                        "value": 10
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "VRF Refrigerant Line Set",
        "description": "Calculates liquid line, suction line, insulation, clamps, and test labor.",
        "is_active": true,
        "category": "HVAC",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111123",
            "toolType": "linear",
            "properties": {
                "name": "VRF Refrigerant Line Set",
                "unit": "ft",
                "color": "#ec4899",
                "group": "HVAC - Piping",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-hvac-piping-01-a",
                        "name": "Copper Liquid Line",
                        "unit": "ft",
                        "unitPrice": 1.85,
                        "quantityFormula": "roundup(qty * 1.05)"
                    },
                    {
                        "id": "sub-hvac-piping-01-b",
                        "name": "Copper Suction Line",
                        "unit": "ft",
                        "unitPrice": 4.25,
                        "quantityFormula": "roundup(qty * 1.05)"
                    },
                    {
                        "id": "sub-hvac-piping-01-c",
                        "name": "Armaflex Insulation",
                        "unit": "ft",
                        "unitPrice": 0.95,
                        "quantityFormula": "roundup(qty * 2)"
                    },
                    {
                        "id": "sub-hvac-piping-01-d",
                        "name": "Cush-Clamps",
                        "unit": "ea",
                        "unitPrice": 3.5,
                        "quantityFormula": "roundup(qty / [support_spacing])"
                    },
                    {
                        "id": "sub-hvac-piping-01-e",
                        "name": "Nitrogen Test",
                        "unit": "hrs",
                        "unitPrice": 95,
                        "quantityFormula": "0.5"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "liquid_line_in",
                        "unit": "in",
                        "value": 0.375
                    },
                    {
                        "id": "var-001",
                        "name": "suction_line_in",
                        "unit": "in",
                        "value": 0.75
                    },
                    {
                        "id": "var-002",
                        "name": "support_spacing",
                        "unit": "ft",
                        "value": 6
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "VAV Box Installation",
        "description": "Count-based VAV takeoff: unit, heating coil, thermostat, flex duct, and labor.",
        "is_active": true,
        "category": "HVAC",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111124",
            "toolType": "count",
            "properties": {
                "name": "VAV Box Installation",
                "unit": "ea",
                "color": "#8b5cf6",
                "group": "HVAC - Equipment",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-hvac-equip-01-a",
                        "name": "VAV Terminal Unit",
                        "unit": "ea",
                        "unitPrice": 450,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "sub-hvac-equip-01-b",
                        "name": "Hot Water Valve 2-Way",
                        "unit": "ea",
                        "unitPrice": 125,
                        "quantityFormula": "qty * [reheat_coil]"
                    },
                    {
                        "id": "sub-hvac-equip-01-c",
                        "name": "Thermostat & Wire",
                        "unit": "set",
                        "unitPrice": 85,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "sub-hvac-equip-01-d",
                        "name": "Flex Duct Connection",
                        "unit": "ft",
                        "unitPrice": 6.5,
                        "quantityFormula": "qty * 5"
                    },
                    {
                        "id": "sub-hvac-equip-01-e",
                        "name": "Labor Total",
                        "unit": "hrs",
                        "unitPrice": 85,
                        "quantityFormula": "qty * [install_hours]"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "inlet_size_in",
                        "unit": "in",
                        "value": 10
                    },
                    {
                        "id": "var-001",
                        "name": "reheat_coil",
                        "unit": "",
                        "value": 1
                    },
                    {
                        "id": "var-002",
                        "name": "install_hours",
                        "unit": "hrs",
                        "value": 12
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Supply Diffuser 24x24",
        "description": "Count-based diffuser takeoff: diffuser, flex duct, straps, and collar.",
        "is_active": true,
        "category": "HVAC",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111125",
            "toolType": "count",
            "properties": {
                "name": "Supply Diffuser 24x24",
                "unit": "ea",
                "color": "#14b8a6",
                "group": "HVAC - Air Dist",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-hvac-grille-01-a",
                        "name": "Lay-in Diffuser",
                        "unit": "ea",
                        "unitPrice": 45,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "sub-hvac-grille-01-b",
                        "name": "Flex Duct R-6",
                        "unit": "ft",
                        "unitPrice": 3.25,
                        "quantityFormula": "qty * [flex_length]"
                    },
                    {
                        "id": "sub-hvac-grille-01-c",
                        "name": "Panduit Straps",
                        "unit": "ea",
                        "unitPrice": 0.5,
                        "quantityFormula": "qty * 2"
                    },
                    {
                        "id": "sub-hvac-grille-01-d",
                        "name": "Spin-in Collar",
                        "unit": "ea",
                        "unitPrice": 12,
                        "quantityFormula": "qty"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "neck_size_in",
                        "unit": "in",
                        "value": 10
                    },
                    {
                        "id": "var-001",
                        "name": "flex_length",
                        "unit": "ft",
                        "value": 6
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Base Cabinet Run (Standard 24\")",
        "description": "Calculates cabinet install, countertop area, backsplash tile, and hardware.",
        "is_active": true,
        "category": "Millwork",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111126",
            "toolType": "linear",
            "properties": {
                "name": "Base Cabinet Run (Standard 24\")",
                "unit": "ft",
                "color": "#d97706",
                "group": "Millwork - Kitchen",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-mill-01-a",
                        "name": "Cabinet Box Install",
                        "unit": "ft",
                        "unitPrice": 45,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "sub-mill-01-b",
                        "name": "Countertop Area",
                        "unit": "sq ft",
                        "unitPrice": 85,
                        "quantityFormula": "qty * (([depth_in] + [counter_overhang_in]) / 12)"
                    },
                    {
                        "id": "sub-mill-01-c",
                        "name": "Backsplash Tile",
                        "unit": "sq ft",
                        "unitPrice": 22,
                        "quantityFormula": "qty * ([splash_height_in] / 12)"
                    },
                    {
                        "id": "sub-mill-01-d",
                        "name": "Toe Kick Skin",
                        "unit": "ft",
                        "unitPrice": 3.5,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "sub-mill-01-e",
                        "name": "Hardware Handles",
                        "unit": "ea",
                        "unitPrice": 8,
                        "quantityFormula": "roundup(qty / 1.5)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "depth_in",
                        "unit": "in",
                        "value": 24
                    },
                    {
                        "id": "var-001",
                        "name": "counter_overhang_in",
                        "unit": "in",
                        "value": 1.5
                    },
                    {
                        "id": "var-002",
                        "name": "splash_height_in",
                        "unit": "in",
                        "value": 18
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Upper Cabinet Run",
        "description": "Calculates upper boxes, crown molding, light rail, and under-cabinet lights.",
        "is_active": true,
        "category": "Millwork",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111127",
            "toolType": "linear",
            "properties": {
                "name": "Upper Cabinet Run",
                "unit": "ft",
                "color": "#b45309",
                "group": "Millwork - Kitchen",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-mill-02-a",
                        "name": "Upper Boxes",
                        "unit": "ft",
                        "unitPrice": 35,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "sub-mill-02-b",
                        "name": "Crown Molding",
                        "unit": "ft",
                        "unitPrice": 6.5,
                        "quantityFormula": "qty * [crown_build_up]"
                    },
                    {
                        "id": "sub-mill-02-c",
                        "name": "Light Rail",
                        "unit": "ft",
                        "unitPrice": 4.25,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "sub-mill-02-d",
                        "name": "LED Under Cab Light",
                        "unit": "ft",
                        "unitPrice": 12,
                        "quantityFormula": "qty"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "cab_height_in",
                        "unit": "in",
                        "value": 36
                    },
                    {
                        "id": "var-001",
                        "name": "crown_build_up",
                        "unit": "",
                        "value": 1
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Shiplap Wall Cladding",
        "description": "Calculates material area, board feet, adhesive, and nails.",
        "is_active": true,
        "category": "Millwork",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111128",
            "toolType": "area",
            "properties": {
                "name": "Shiplap Wall Cladding",
                "unit": "sq ft",
                "color": "#57534e",
                "group": "Millwork - Wall Panels",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-mill-03-a",
                        "name": "Total Material Area",
                        "unit": "sq ft",
                        "unitPrice": 0,
                        "quantityFormula": "roundup(qty * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "sub-mill-03-b",
                        "name": "Linear Feet of Board",
                        "unit": "ft",
                        "unitPrice": 2.25,
                        "quantityFormula": "roundup([Total_Material_Area] * (12 / [board_width_in]))"
                    },
                    {
                        "id": "sub-mill-03-c",
                        "name": "Construction Adhesive",
                        "unit": "tube",
                        "unitPrice": 8,
                        "quantityFormula": "roundup(qty / 32)"
                    },
                    {
                        "id": "sub-mill-03-d",
                        "name": "Brad Nails (Box)",
                        "unit": "box",
                        "unitPrice": 15,
                        "quantityFormula": "roundup((qty * [nails_per_sf]) / 1000)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "board_width_in",
                        "unit": "in",
                        "value": 5.5
                    },
                    {
                        "id": "var-001",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 15
                    },
                    {
                        "id": "var-002",
                        "name": "nails_per_sf",
                        "unit": "ea/sf",
                        "value": 6
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Wainscoting (Judge's Paneling)",
        "description": "Calculates MDF panel area, sheets, cap molding, stiles, and painting.",
        "is_active": true,
        "category": "Millwork",
        "template_data": {
            "id": "2f4a56c1-5271-4191-b123-111111111129",
            "toolType": "linear",
            "properties": {
                "name": "Wainscoting (Judge's Paneling)",
                "unit": "ft",
                "color": "#78350f",
                "group": "Millwork - Wall Panels",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "sub-mill-04-a",
                        "name": "Panel Area (MDF)",
                        "unit": "sq ft",
                        "unitPrice": 0,
                        "quantityFormula": "qty * ([panel_height_in] / 12)"
                    },
                    {
                        "id": "sub-mill-04-b",
                        "name": "MDF Sheets 4x8",
                        "unit": "sheets",
                        "unitPrice": 45,
                        "quantityFormula": "roundup(([Panel_Area_MDF] / 32) * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "sub-mill-04-c",
                        "name": "Cap Molding",
                        "unit": "ft",
                        "unitPrice": 5.5,
                        "quantityFormula": "qty * 1.1"
                    },
                    {
                        "id": "sub-mill-04-d",
                        "name": "Vertical Stiles",
                        "unit": "ea",
                        "unitPrice": 12,
                        "quantityFormula": "roundup(qty / ([stile_spacing_in] / 12))"
                    },
                    {
                        "id": "sub-mill-04-e",
                        "name": "Painter Labor",
                        "unit": "sq ft",
                        "unitPrice": 3.75,
                        "quantityFormula": "[Panel_Area_MDF]"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "panel_height_in",
                        "unit": "in",
                        "value": 42
                    },
                    {
                        "id": "var-001",
                        "name": "stile_spacing_in",
                        "unit": "in",
                        "value": 24
                    },
                    {
                        "id": "var-002",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 10
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Hardwood Flooring (Nail Down)",
        "description": "Solid hardwood plank installation including paper, fasteners, and labor.",
        "is_active": true,
        "category": "Flooring",
        "template_data": {
            "id": "tpl-flooring-hardwood-001",
            "toolType": "area",
            "properties": {
                "name": "Hardwood Flooring (Nail Down)",
                "unit": "ft\u00b2",
                "color": "#000000",
                "group": "",
                "formula": "qty",
                "subItems": [],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "name",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-001",
                        "name": "unit",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-002",
                        "name": "color",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-003",
                        "name": "group",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-004",
                        "name": "formula",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-005",
                        "name": "subItems",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-006",
                        "name": "unitCost",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-007",
                        "name": "deduction",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-008",
                        "name": "variables",
                        "unit": "",
                        "value": 0
                    }
                ]
            }
        },
        "created_at": 1767016954323
    },
    {
        "name": "4\" Slab on Grade",
        "description": "Calculates labor, rebar weight, and concrete volume for a 4-inch slab on grade.",
        "is_active": true,
        "category": "Concrete",
        "template_data": {
            "id": "453e631e-f811-45a2-8048-392d349f680e",
            "toolType": "area",
            "properties": {
                "name": "4\" Slab on Grade",
                "unit": "sq ft",
                "color": "#ef4444",
                "group": "Concrete",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "63483808-cd5c-4ba4-b966-cc6c34c6d277",
                        "name": "Cubic Yards - Labor",
                        "unit": "cy",
                        "unitPrice": 250,
                        "quantityFormula": "roundup(qty * ([thickness_in] / 12) / 27 * (([slope_percent] / 100) + 1))"
                    },
                    {
                        "id": "ba453aae-16b7-4823-ae26-c578b1f0daee",
                        "name": "#4 Rebar LBS @ 12 O,C",
                        "unit": "lbs",
                        "unitPrice": 0.8,
                        "quantityFormula": "qty * 0.98"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "thickness_in",
                        "unit": "in",
                        "value": 6
                    },
                    {
                        "id": "var-001",
                        "name": "slope_percent",
                        "unit": "%",
                        "value": 5
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Interior Wall with Materials",
        "description": "Calculates drywall area, sheets count, studs count, and tape/screws based on linear wall length.",
        "is_active": true,
        "category": "Drywall & Carpentry",
        "template_data": {
            "id": "cba5b74d-9fa9-433a-8e4c-0a06f8a09b92",
            "toolType": "linear",
            "properties": {
                "name": "Interior wall",
                "unit": "ft",
                "color": "#ef4444",
                "group": "General",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "8ce40383-39d9-4d35-ae22-77604492bdf1",
                        "name": "area",
                        "unit": "sq ft",
                        "unitPrice": 0,
                        "quantityFormula": "qty * [height]"
                    },
                    {
                        "id": "730f5eb1-6728-4886-abab-10e237be49f5",
                        "name": "sheets",
                        "unit": "ea",
                        "unitPrice": 15,
                        "quantityFormula": "[area] / 32"
                    },
                    {
                        "id": "1ac7babd-73b5-4ec8-9a27-94170a7e3ae2",
                        "name": "studs",
                        "unit": "ft",
                        "unitPrice": 1.3,
                        "quantityFormula": "(qty / 1.333) * 10"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "height",
                        "unit": "ft",
                        "value": 8
                    }
                ]
            }
        },
        "created_at": 1765196830177
    },
    {
        "name": "Trench Excavation",
        "description": "Calculates excavation volume, bedding sand, and haul-off volume.",
        "is_active": true,
        "category": "Site Work",
        "template_data": {
            "id": "8d2e1a3b-0000-4100-a000-000000000016",
            "toolType": "linear",
            "properties": {
                "name": "Trench Excavation",
                "unit": "ft",
                "color": "#854d0e",
                "group": "Site Work",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-0000-4100-a000-000000000001",
                        "name": "Excavation CY",
                        "unit": "cy",
                        "unitPrice": 25,
                        "quantityFormula": "roundup((qty * [width_ft] * [depth_ft]) / 27)"
                    },
                    {
                        "id": "5a1b2c3d-0000-4100-a000-000000000002",
                        "name": "Bedding Sand Ton",
                        "unit": "ton",
                        "unitPrice": 35,
                        "quantityFormula": "roundup((qty * [width_ft] * 0.5) / 27 * 1.5)"
                    },
                    {
                        "id": "5a1b2c3d-0000-4100-a000-000000000003",
                        "name": "Haul Off CY",
                        "unit": "cy",
                        "unitPrice": 40,
                        "quantityFormula": "roundup([Excavation_CY] * 1.2)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "width_ft",
                        "unit": "ft",
                        "value": 2
                    },
                    {
                        "id": "var-001",
                        "name": "depth_ft",
                        "unit": "ft",
                        "value": 3
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Asphalt Shingle Roof",
        "description": "Calculates squares, bundles, underlayment, and nails for asphalt shingle roofing.",
        "is_active": true,
        "category": "Roofing",
        "template_data": {
            "id": "8d2e1a3b-1111-4000-a000-000000000001",
            "toolType": "area",
            "properties": {
                "name": "Asphalt Shingle Roof",
                "unit": "sq ft",
                "color": "#475569",
                "group": "Roofing",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-1111-4000-a000-000000000001",
                        "name": "Roof Squares (100sf)",
                        "unit": "sq",
                        "unitPrice": 0,
                        "quantityFormula": "(qty * [pitch_factor]) / 100"
                    },
                    {
                        "id": "5a1b2c3d-1111-4000-a000-000000000002",
                        "name": "Shingle Bundles",
                        "unit": "ea",
                        "unitPrice": 35,
                        "quantityFormula": "roundup([Roof_Squares_100sf] * 3 * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "5a1b2c3d-1111-4000-a000-000000000003",
                        "name": "Underlayment Rolls",
                        "unit": "roll",
                        "unitPrice": 45,
                        "quantityFormula": "roundup([Roof_Squares_100sf] / 4)"
                    },
                    {
                        "id": "5a1b2c3d-1111-4000-a000-000000000004",
                        "name": "Roofing Nails (Box)",
                        "unit": "box",
                        "unitPrice": 28,
                        "quantityFormula": "roundup([Roof_Squares_100sf] / 20)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "pitch_factor",
                        "unit": "",
                        "value": 1.05
                    },
                    {
                        "id": "var-001",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 15
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Metal Stud Partition 3-5/8",
        "description": "Calculates tracks, metal studs, screws, and framing labor.",
        "is_active": true,
        "category": "Drywall & Carpentry",
        "template_data": {
            "id": "8d2e1a3b-1111-4100-a000-000000000017",
            "toolType": "linear",
            "properties": {
                "name": "Metal Stud Partition 3-5/8",
                "unit": "ft",
                "color": "#94a3b8",
                "group": "Drywall & Carpentry",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-1111-4100-a000-000000000001",
                        "name": "Track 10'",
                        "unit": "ea",
                        "unitPrice": 12,
                        "quantityFormula": "roundup(qty * 2 / 10)"
                    },
                    {
                        "id": "5a1b2c3d-1111-4100-a000-000000000002",
                        "name": "Studs 12'",
                        "unit": "ea",
                        "unitPrice": 14,
                        "quantityFormula": "roundup(qty / ([centers] / 12))"
                    },
                    {
                        "id": "5a1b2c3d-1111-4100-a000-000000000003",
                        "name": "Screws Box",
                        "unit": "box",
                        "unitPrice": 25,
                        "quantityFormula": "roundup(qty / 50)"
                    },
                    {
                        "id": "5a1b2c3d-1111-4100-a000-000000000004",
                        "name": "Framing Labor",
                        "unit": "ft",
                        "unitPrice": 8.5,
                        "quantityFormula": "qty"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "height",
                        "unit": "ft",
                        "value": 10
                    },
                    {
                        "id": "var-001",
                        "name": "centers",
                        "unit": "in",
                        "value": 16
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Gutter System",
        "description": "Calculates gutter length, downspouts, elbows, and splash blocks.",
        "is_active": true,
        "category": "Exterior",
        "template_data": {
            "id": "8d2e1a3b-2222-4100-a000-000000000018",
            "toolType": "linear",
            "properties": {
                "name": "Gutter System",
                "unit": "ft",
                "color": "#0284c7",
                "group": "Exterior",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-2222-4100-a000-000000000001",
                        "name": "Gutter Section",
                        "unit": "ft",
                        "unitPrice": 6.5,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "5a1b2c3d-2222-4100-a000-000000000002",
                        "name": "Downspout Section",
                        "unit": "ft",
                        "unitPrice": 5.5,
                        "quantityFormula": "[downspouts] * 10"
                    },
                    {
                        "id": "5a1b2c3d-2222-4100-a000-000000000003",
                        "name": "Elbows",
                        "unit": "ea",
                        "unitPrice": 4,
                        "quantityFormula": "[downspouts] * 3"
                    },
                    {
                        "id": "5a1b2c3d-2222-4100-a000-000000000004",
                        "name": "Splash Blocks",
                        "unit": "ea",
                        "unitPrice": 12,
                        "quantityFormula": "[downspouts]"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "downspouts",
                        "unit": "ea",
                        "value": 4
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Duplex Receptacle 15A",
        "description": "Count-based electrical takeoff: boxes, devices, plates, wire, and labor.",
        "is_active": true,
        "category": "Electrical",
        "template_data": {
            "id": "8d2e1a3b-3333-4000-a000-000000000003",
            "toolType": "count",
            "properties": {
                "name": "Duplex Receptacle 15A",
                "unit": "ea",
                "color": "#f59e0b",
                "group": "Electrical",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-3333-4000-a000-000000000001",
                        "name": "Single Gang Box",
                        "unit": "ea",
                        "unitPrice": 0.75,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "5a1b2c3d-3333-4000-a000-000000000002",
                        "name": "15A Device",
                        "unit": "ea",
                        "unitPrice": 1.25,
                        "quantityFormula": "qty * [gang_count]"
                    },
                    {
                        "id": "5a1b2c3d-3333-4000-a000-000000000003",
                        "name": "Cover Plate",
                        "unit": "ea",
                        "unitPrice": 0.5,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "5a1b2c3d-3333-4000-a000-000000000004",
                        "name": "12/2 Romex Wire",
                        "unit": "ft",
                        "unitPrice": 0.42,
                        "quantityFormula": "qty * [wire_length_per_drop]"
                    },
                    {
                        "id": "5a1b2c3d-3333-4000-a000-000000000005",
                        "name": "Electrician Labor",
                        "unit": "hrs",
                        "unitPrice": 85,
                        "quantityFormula": "qty * 0.4"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "wire_length_per_drop",
                        "unit": "ft",
                        "value": 15
                    },
                    {
                        "id": "var-001",
                        "name": "gang_count",
                        "unit": "ea",
                        "value": 1
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Chain Link Fence 6'",
        "description": null,
        "is_active": true,
        "category": "Site Work",
        "template_data": {
            "id": "8d2e1a3b-3333-4100-a000-000000000019",
            "toolType": "linear",
            "properties": {
                "name": "Chain Link Fence 6'",
                "unit": "ft",
                "color": "#4ade80",
                "group": "Site Work",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-3333-4100-a000-000000000001",
                        "name": "Line Posts",
                        "unit": "ea",
                        "unitPrice": 28,
                        "quantityFormula": "roundup(qty / [post_spacing])"
                    },
                    {
                        "id": "5a1b2c3d-3333-4100-a000-000000000002",
                        "name": "Fabric Roll 50'",
                        "unit": "roll",
                        "unitPrice": 180,
                        "quantityFormula": "roundup(qty / 50)"
                    },
                    {
                        "id": "5a1b2c3d-3333-4100-a000-000000000003",
                        "name": "Top Rail 20'",
                        "unit": "ea",
                        "unitPrice": 35,
                        "quantityFormula": "roundup(qty / 20)"
                    },
                    {
                        "id": "5a1b2c3d-3333-4100-a000-000000000004",
                        "name": "Concrete Bags",
                        "unit": "bag",
                        "unitPrice": 8,
                        "quantityFormula": "[Line_Posts] * 2"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "post_spacing",
                        "unit": "ft",
                        "value": 10
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Exterior Wall Paint",
        "description": "Calculates paint and primer gallons, prep materials, and painter labor hours.",
        "is_active": true,
        "category": "Painting",
        "template_data": {
            "id": "8d2e1a3b-4444-4000-a000-000000000004",
            "toolType": "area",
            "properties": {
                "name": "Exterior Wall Paint",
                "unit": "sq ft",
                "color": "#06b6d4",
                "group": "Painting",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-4444-4000-a000-000000000001",
                        "name": "Primer",
                        "unit": "gal",
                        "unitPrice": 35,
                        "quantityFormula": "roundup(qty / [coverage_sf_gal])"
                    },
                    {
                        "id": "5a1b2c3d-4444-4000-a000-000000000002",
                        "name": "Paint",
                        "unit": "gal",
                        "unitPrice": 45,
                        "quantityFormula": "roundup((qty * [coats]) / [coverage_sf_gal])"
                    },
                    {
                        "id": "5a1b2c3d-4444-4000-a000-000000000003",
                        "name": "Masking/Prep Material",
                        "unit": "ls",
                        "unitPrice": 50,
                        "quantityFormula": "roundup(qty / 1000) * 10"
                    },
                    {
                        "id": "5a1b2c3d-4444-4000-a000-000000000004",
                        "name": "Painter Labor",
                        "unit": "sq ft",
                        "unitPrice": 0.95,
                        "quantityFormula": "qty"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "coats",
                        "unit": "ea",
                        "value": 2
                    },
                    {
                        "id": "var-001",
                        "name": "coverage_sf_gal",
                        "unit": "sf/gal",
                        "value": 350
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Demolition - Flooring",
        "description": "Calculates debris volume, dumpster loads, and demolition labor hours.",
        "is_active": true,
        "category": "Demolition",
        "template_data": {
            "id": "8d2e1a3b-4444-4100-a000-000000000020",
            "toolType": "area",
            "properties": {
                "name": "Demolition - Flooring",
                "unit": "sq ft",
                "color": "#1e293b",
                "group": "Demolition",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-4444-4100-a000-000000000001",
                        "name": "Debris CY",
                        "unit": "cy",
                        "unitPrice": 0,
                        "quantityFormula": "roundup((qty * ([thickness_in] / 12)) / 27)"
                    },
                    {
                        "id": "5a1b2c3d-4444-4100-a000-000000000002",
                        "name": "Dumpster Load",
                        "unit": "load",
                        "unitPrice": 550,
                        "quantityFormula": "roundup([Debris_CY] / 20)"
                    },
                    {
                        "id": "5a1b2c3d-4444-4100-a000-000000000003",
                        "name": "Labor Hrs",
                        "unit": "hrs",
                        "unitPrice": 45,
                        "quantityFormula": "qty / 100"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "thickness_in",
                        "unit": "in",
                        "value": 1
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Silt Fence",
        "description": "Calculates fabric rolls, posts count, and labor for site silt fencing.",
        "is_active": true,
        "category": "Site Work",
        "template_data": {
            "id": "8d2e1a3b-5555-4000-a000-000000000005",
            "toolType": "linear",
            "properties": {
                "name": "Silt Fence",
                "unit": "ft",
                "color": "#65a30d",
                "group": "Site Work",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-5555-4000-a000-000000000001",
                        "name": "Fabric Roll (100')",
                        "unit": "roll",
                        "unitPrice": 40,
                        "quantityFormula": "roundup(qty / 100)"
                    },
                    {
                        "id": "5a1b2c3d-5555-4000-a000-000000000002",
                        "name": "Wood Posts",
                        "unit": "ea",
                        "unitPrice": 3.5,
                        "quantityFormula": "roundup(qty / [post_spacing]) + 1"
                    },
                    {
                        "id": "5a1b2c3d-5555-4000-a000-000000000003",
                        "name": "Labor",
                        "unit": "ft",
                        "unitPrice": 1.5,
                        "quantityFormula": "qty"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "post_spacing",
                        "unit": "ft",
                        "value": 6
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Brick Veneer",
        "description": "Calculates brick count, mortar bags, wall ties, and mason labor.",
        "is_active": true,
        "category": "Masonry",
        "template_data": {
            "id": "8d2e1a3b-6666-4000-a000-000000000006",
            "toolType": "area",
            "properties": {
                "name": "Brick Veneer",
                "unit": "sq ft",
                "color": "#b91c1c",
                "group": "Masonry",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-6666-4000-a000-000000000001",
                        "name": "Standard Bricks",
                        "unit": "ea",
                        "unitPrice": 0.65,
                        "quantityFormula": "roundup((qty * [bricks_per_sf]) * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "5a1b2c3d-6666-4000-a000-000000000002",
                        "name": "Mortar Bags (Type N)",
                        "unit": "bag",
                        "unitPrice": 12,
                        "quantityFormula": "roundup(qty / 40)"
                    },
                    {
                        "id": "5a1b2c3d-6666-4000-a000-000000000003",
                        "name": "Wall Ties",
                        "unit": "ea",
                        "unitPrice": 0.15,
                        "quantityFormula": "roundup(qty / 2)"
                    },
                    {
                        "id": "5a1b2c3d-6666-4000-a000-000000000004",
                        "name": "Mason Labor",
                        "unit": "sq ft",
                        "unitPrice": 14,
                        "quantityFormula": "qty"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "bricks_per_sf",
                        "unit": "ea/sf",
                        "value": 6.75
                    },
                    {
                        "id": "var-001",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 5
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Toilet Rough-in PVC",
        "description": "Calculates pipe length, elbows, flange, and plumber labor for rough-in.",
        "is_active": true,
        "category": "Plumbing",
        "template_data": {
            "id": "8d2e1a3b-7777-4000-a000-000000000007",
            "toolType": "count",
            "properties": {
                "name": "Toilet Rough-in PVC",
                "unit": "ea",
                "color": "#3b82f6",
                "group": "Plumbing",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-7777-4000-a000-000000000001",
                        "name": "3\" PVC Pipe",
                        "unit": "ft",
                        "unitPrice": 3.2,
                        "quantityFormula": "qty * [pipe_length_avg]"
                    },
                    {
                        "id": "5a1b2c3d-7777-4000-a000-000000000002",
                        "name": "3\" Elbows 90",
                        "unit": "ea",
                        "unitPrice": 4.5,
                        "quantityFormula": "qty * 3"
                    },
                    {
                        "id": "5a1b2c3d-7777-4000-a000-000000000003",
                        "name": "Toilet Flange",
                        "unit": "ea",
                        "unitPrice": 6,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "5a1b2c3d-7777-4000-a000-000000000004",
                        "name": "Plumber Labor",
                        "unit": "hrs",
                        "unitPrice": 95,
                        "quantityFormula": "qty * 1.5"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "pipe_length_avg",
                        "unit": "ft/ea",
                        "value": 10
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "10\" Round Duct Run",
        "description": "Calculates duct length, hangers, and sealant for 10\" round duct runs.",
        "is_active": true,
        "category": "HVAC",
        "template_data": {
            "id": "8d2e1a3b-8888-4000-a000-000000000008",
            "toolType": "linear",
            "properties": {
                "name": "10\" Round Duct Run",
                "unit": "ft",
                "color": "#14b8a6",
                "group": "HVAC",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-8888-4000-a000-000000000001",
                        "name": "10\" Spiral Duct",
                        "unit": "ft",
                        "unitPrice": 8.5,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "5a1b2c3d-8888-4000-a000-000000000002",
                        "name": "Hanger Straps",
                        "unit": "ea",
                        "unitPrice": 2,
                        "quantityFormula": "roundup(qty / [strap_spacing])"
                    },
                    {
                        "id": "5a1b2c3d-8888-4000-a000-000000000003",
                        "name": "Sealant",
                        "unit": "tube",
                        "unitPrice": 8,
                        "quantityFormula": "roundup(qty / 50)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "strap_spacing",
                        "unit": "ft",
                        "value": 5
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "2x10 Floor Joists",
        "description": "Calculates joist count, lumber length, subfloor glue, and framing labor.",
        "is_active": true,
        "category": "Drywall & Carpentry",
        "template_data": {
            "id": "8d2e1a3b-9999-4000-a000-000000000009",
            "toolType": "area",
            "properties": {
                "name": "2x10 Floor Joists",
                "unit": "sq ft",
                "color": "#a16207",
                "group": "Drywall & Carpentry",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-9999-4000-a000-000000000001",
                        "name": "Joist Linear Feet",
                        "unit": "ft",
                        "unitPrice": 0,
                        "quantityFormula": "(qty * 12) / [joist_oc_spacing]"
                    },
                    {
                        "id": "5a1b2c3d-9999-4000-a000-000000000002",
                        "name": "2x10 Lumber",
                        "unit": "ft",
                        "unitPrice": 2.1,
                        "quantityFormula": "roundup([Joist_Linear_Feet] * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "5a1b2c3d-9999-4000-a000-000000000003",
                        "name": "Subfloor Glue",
                        "unit": "tube",
                        "unitPrice": 6,
                        "quantityFormula": "roundup(qty / 50)"
                    },
                    {
                        "id": "5a1b2c3d-9999-4000-a000-000000000004",
                        "name": "Framing Labor",
                        "unit": "sq ft",
                        "unitPrice": 2.25,
                        "quantityFormula": "qty"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "joist_oc_spacing",
                        "unit": "in",
                        "value": 16
                    },
                    {
                        "id": "var-001",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 8
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Sod Installation",
        "description": "Calculates topsoil volume, sod pallets, and installation labor.",
        "is_active": true,
        "category": "Landscaping",
        "template_data": {
            "id": "8d2e1a3b-aaaa-4000-a000-000000000010",
            "toolType": "area",
            "properties": {
                "name": "Sod Installation",
                "unit": "sq ft",
                "color": "#15803d",
                "group": "Landscaping",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-aaaa-4000-a000-000000000001",
                        "name": "Topsoil",
                        "unit": "cy",
                        "unitPrice": 45,
                        "quantityFormula": "(qty * ([topsoil_depth_in] / 12)) / 27"
                    },
                    {
                        "id": "5a1b2c3d-aaaa-4000-a000-000000000002",
                        "name": "Sod Pallet (450sf)",
                        "unit": "pallet",
                        "unitPrice": 250,
                        "quantityFormula": "roundup(qty * (([waste_factor] / 100) + 1) / 450)"
                    },
                    {
                        "id": "5a1b2c3d-aaaa-4000-a000-000000000003",
                        "name": "Labor",
                        "unit": "sq ft",
                        "unitPrice": 0.65,
                        "quantityFormula": "qty"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 5
                    },
                    {
                        "id": "var-001",
                        "name": "topsoil_depth_in",
                        "unit": "in",
                        "value": 2
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Suspended Ceiling 2x4",
        "description": "Calculates tiles, main runners, cross tees, wall angle, and hanger wire.",
        "is_active": true,
        "category": "Finishes",
        "template_data": {
            "id": "8d2e1a3b-bbbb-4000-a000-000000000011",
            "toolType": "area",
            "properties": {
                "name": "Suspended Ceiling 2x4",
                "unit": "sq ft",
                "color": "#e2e8f0",
                "group": "Finishes",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-bbbb-4000-a000-000000000001",
                        "name": "Ceiling Tiles 2x4",
                        "unit": "ea",
                        "unitPrice": 4.5,
                        "quantityFormula": "roundup((qty / 8) * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "5a1b2c3d-bbbb-4000-a000-000000000002",
                        "name": "Main Runners 12'",
                        "unit": "ea",
                        "unitPrice": 12,
                        "quantityFormula": "roundup((qty / 48) * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "5a1b2c3d-bbbb-4000-a000-000000000003",
                        "name": "Cross Tees 4'",
                        "unit": "ea",
                        "unitPrice": 4,
                        "quantityFormula": "roundup((qty / 16) * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "5a1b2c3d-bbbb-4000-a000-000000000004",
                        "name": "Wall Angle 12'",
                        "unit": "ea",
                        "unitPrice": 6,
                        "quantityFormula": "roundup((sqrt(qty) * 4 * (([border_factor] / 100) + 1)) / 12)"
                    },
                    {
                        "id": "5a1b2c3d-bbbb-4000-a000-000000000005",
                        "name": "Hanger Wire 12ga",
                        "unit": "roll",
                        "unitPrice": 35,
                        "quantityFormula": "roundup(qty / 400)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 10
                    },
                    {
                        "id": "var-001",
                        "name": "border_factor",
                        "unit": "%",
                        "value": 5
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Continuous Footing 24x12",
        "description": "Calculates concrete volume, formwork area, and rebar length for footing.",
        "is_active": true,
        "category": "Concrete",
        "template_data": {
            "id": "8d2e1a3b-cccc-4000-a000-000000000012",
            "toolType": "linear",
            "properties": {
                "name": "Continuous Footing 24x12",
                "unit": "ft",
                "color": "#57534e",
                "group": "Concrete",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-cccc-4000-a000-000000000001",
                        "name": "Concrete CY",
                        "unit": "cy",
                        "unitPrice": 145,
                        "quantityFormula": "roundup((qty * ([width_in] / 12) * ([depth_in] / 12)) / 27)"
                    },
                    {
                        "id": "5a1b2c3d-cccc-4000-a000-000000000002",
                        "name": "Formwork SF",
                        "unit": "sq ft",
                        "unitPrice": 3.5,
                        "quantityFormula": "qty * ([depth_in] / 12) * 2"
                    },
                    {
                        "id": "5a1b2c3d-cccc-4000-a000-000000000003",
                        "name": "Rebar #4 LF",
                        "unit": "ft",
                        "unitPrice": 0.9,
                        "quantityFormula": "qty * [rebar_rows] * 1.1"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "width_in",
                        "unit": "in",
                        "value": 24
                    },
                    {
                        "id": "var-001",
                        "name": "depth_in",
                        "unit": "in",
                        "value": 12
                    },
                    {
                        "id": "var-002",
                        "name": "rebar_rows",
                        "unit": "ea",
                        "value": 2
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Vinyl Siding",
        "description": "Calculates siding squares, J-channel, starter strip, and install labor.",
        "is_active": true,
        "category": "Exterior",
        "template_data": {
            "id": "8d2e1a3b-dddd-4000-a000-000000000013",
            "toolType": "area",
            "properties": {
                "name": "Vinyl Siding",
                "unit": "sq ft",
                "color": "#38bdf8",
                "group": "Exterior",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-dddd-4000-a000-000000000001",
                        "name": "Siding Squares",
                        "unit": "sq",
                        "unitPrice": 120,
                        "quantityFormula": "roundup((qty / 100) * (([waste_factor] / 100) + 1))"
                    },
                    {
                        "id": "5a1b2c3d-dddd-4000-a000-000000000002",
                        "name": "J-Channel",
                        "unit": "ft",
                        "unitPrice": 0.85,
                        "quantityFormula": "qty * 0.8"
                    },
                    {
                        "id": "5a1b2c3d-dddd-4000-a000-000000000003",
                        "name": "Starter Strip",
                        "unit": "ft",
                        "unitPrice": 0.75,
                        "quantityFormula": "sqrt(qty) * 4"
                    },
                    {
                        "id": "5a1b2c3d-dddd-4000-a000-000000000004",
                        "name": "Install Labor",
                        "unit": "sq ft",
                        "unitPrice": 1.75,
                        "quantityFormula": "qty"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 10
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Interior Door 3068",
        "description": "Count-based door takeoff: slab, frame, hinges, lockset, and shims.",
        "is_active": true,
        "category": "Doors & Windows",
        "template_data": {
            "id": "8d2e1a3b-eeee-4000-a000-000000000014",
            "toolType": "count",
            "properties": {
                "name": "Interior Door 3068",
                "unit": "ea",
                "color": "#a855f7",
                "group": "Doors & Windows",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-eeee-4000-a000-000000000001",
                        "name": "Door Slab",
                        "unit": "ea",
                        "unitPrice": 65,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "5a1b2c3d-eeee-4000-a000-000000000002",
                        "name": "Frame Kit",
                        "unit": "ea",
                        "unitPrice": 45,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "5a1b2c3d-eeee-4000-a000-000000000003",
                        "name": "Hinges (Pair)",
                        "unit": "pair",
                        "unitPrice": 12,
                        "quantityFormula": "qty * 1.5"
                    },
                    {
                        "id": "5a1b2c3d-eeee-4000-a000-000000000004",
                        "name": "Lockset",
                        "unit": "ea",
                        "unitPrice": 35,
                        "quantityFormula": "qty"
                    },
                    {
                        "id": "5a1b2c3d-eeee-4000-a000-000000000005",
                        "name": "Shims Bundle",
                        "unit": "bundle",
                        "unitPrice": 4.5,
                        "quantityFormula": "roundup(qty / 5)"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "wall_thickness_in",
                        "unit": "in",
                        "value": 4.5
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Baseboard 1x6",
        "description": "Calculates baseboard linear feet, coping labor, and paint length.",
        "is_active": true,
        "category": "Finishes",
        "template_data": {
            "id": "8d2e1a3b-ffff-4000-a000-000000000015",
            "toolType": "linear",
            "properties": {
                "name": "Baseboard 1x6",
                "unit": "ft",
                "color": "#f472b6",
                "group": "Finishes",
                "formula": "qty",
                "subItems": [
                    {
                        "id": "5a1b2c3d-ffff-4000-a000-000000000001",
                        "name": "Baseboard Material",
                        "unit": "ft",
                        "unitPrice": 1.85,
                        "quantityFormula": "qty * (([waste_factor] / 100) + 1)"
                    },
                    {
                        "id": "5a1b2c3d-ffff-4000-a000-000000000002",
                        "name": "Coping Labor Hrs",
                        "unit": "hrs",
                        "unitPrice": 55,
                        "quantityFormula": "roundup(qty / 40)"
                    },
                    {
                        "id": "5a1b2c3d-ffff-4000-a000-000000000003",
                        "name": "Paint Baseboard",
                        "unit": "ft",
                        "unitPrice": 0.75,
                        "quantityFormula": "qty"
                    }
                ],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "waste_factor",
                        "unit": "%",
                        "value": 5
                    }
                ]
            }
        },
        "created_at": 1765289913204
    },
    {
        "name": "Concrete Slab CU YD",
        "description": "Calculates concrete volume in Cubic Yards, including thickness and slope adjustments.",
        "is_active": true,
        "category": "Concrete",
        "template_data": {
            "id": "f4d32059-7ee5-49b4-8001-3086y16f3e93",
            "toolType": "area",
            "properties": {
                "name": "Concrete Slab CU YD",
                "unit": "sq ft",
                "color": "#84cc16",
                "group": "Concrete",
                "formula": "((qty * ([thickness_in] / 12)) / 27) * (([slope_factor] / 100) + 1)",
                "subItems": [],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "thickness_in",
                        "unit": "in",
                        "value": 4
                    },
                    {
                        "id": "var-001",
                        "name": "slope_factor",
                        "unit": "%",
                        "value": 5
                    }
                ]
            }
        },
        "created_at": 1765196830177
    },
    {
        "name": "Luxury Vinyl Plank (LVP)",
        "description": "Floating LVP installation with accounting for box rounding.",
        "is_active": true,
        "category": "Flooring",
        "template_data": {
            "id": "tpl-flooring-lvp-001",
            "toolType": "area",
            "properties": {
                "name": "Luxury Vinyl Plank (LVP)",
                "unit": "ft\u00b2",
                "color": "#000000",
                "group": "",
                "formula": "qty",
                "subItems": [],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "name",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-001",
                        "name": "unit",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-002",
                        "name": "color",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-003",
                        "name": "group",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-004",
                        "name": "formula",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-005",
                        "name": "subItems",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-006",
                        "name": "unitCost",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-007",
                        "name": "deduction",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-008",
                        "name": "variables",
                        "unit": "",
                        "value": 0
                    }
                ]
            }
        },
        "created_at": 1767016954323
    },
    {
        "name": "Epoxy Garage System",
        "description": "2-part epoxy coating with flake broadcast.",
        "is_active": true,
        "category": "Flooring",
        "template_data": {
            "id": "tpl-flooring-epoxy-001",
            "toolType": "area",
            "properties": {
                "name": "Epoxy Garage System",
                "unit": "ft\u00b2",
                "color": "#000000",
                "group": "",
                "formula": "qty",
                "subItems": [],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "name",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-001",
                        "name": "unit",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-002",
                        "name": "color",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-003",
                        "name": "group",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-004",
                        "name": "formula",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-005",
                        "name": "subItems",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-006",
                        "name": "unitCost",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-007",
                        "name": "deduction",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-008",
                        "name": "variables",
                        "unit": "",
                        "value": 0
                    }
                ]
            }
        },
        "created_at": 1767016954323
    },
    {
        "name": "Carpet & Pad",
        "description": "Broadloom carpet with padding and tack strip estimation.",
        "is_active": true,
        "category": "Flooring",
        "template_data": {
            "id": "tpl-flooring-carpet-001",
            "toolType": "area",
            "properties": {
                "name": "Carpet & Pad",
                "unit": "ft\u00b2",
                "color": "#000000",
                "group": "",
                "formula": "qty",
                "subItems": [],
                "unitCost": 0,
                "deduction": false,
                "variables": [
                    {
                        "id": "var-000",
                        "name": "name",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-001",
                        "name": "unit",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-002",
                        "name": "color",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-003",
                        "name": "group",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-004",
                        "name": "formula",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-005",
                        "name": "subItems",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-006",
                        "name": "unitCost",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-007",
                        "name": "deduction",
                        "unit": "",
                        "value": 0
                    },
                    {
                        "id": "var-008",
                        "name": "variables",
                        "unit": "",
                        "value": 0
                    }
                ]
            }
        },
        "created_at": 1767016954323
    },
];
