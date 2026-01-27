import React, { useState } from 'react';
import { useInfraStore } from '../../store/infraStore';

const DeploymentConfigBar: React.FC = () => {
    const deploymentConfig = useInfraStore((state) => state.deploymentConfig);
    const updateDeploymentConfig = useInfraStore((state) => state.updateDeploymentConfig);

    const [showRegionPicker, setShowRegionPicker] = useState(false);

    const AWS_REGIONS = [
        { value: 'us-east-1', label: 'US East (N. Virginia)' },
        { value: 'us-east-2', label: 'US East (Ohio)' },
        { value: 'us-west-1', label: 'US West (N. California)' },
        { value: 'us-west-2', label: 'US West (Oregon)' },
        { value: 'eu-west-1', label: 'EU (Ireland)' },
        { value: 'eu-central-1', label: 'EU (Frankfurt)' },
        { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
        { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    ];

    const AZ_MAP: Record<string, string[]> = {
        'us-east-1': ['us-east-1a', 'us-east-1b', 'us-east-1c', 'us-east-1d', 'us-east-1e', 'us-east-1f'],
        'us-east-2': ['us-east-2a', 'us-east-2b', 'us-east-2c'],
        'us-west-1': ['us-west-1a', 'us-west-1b', 'us-west-1c'],
        'us-west-2': ['us-west-2a', 'us-west-2b', 'us-west-2c', 'us-west-2d'],
        'eu-west-1': ['eu-west-1a', 'eu-west-1b', 'eu-west-1c'],
        'eu-central-1': ['eu-central-1a', 'eu-central-1b', 'eu-central-1c'],
        'ap-southeast-1': ['ap-southeast-1a', 'ap-southeast-1b', 'ap-southeast-1c'],
        'ap-northeast-1': ['ap-northeast-1a', 'ap-northeast-1b', 'ap-northeast-1c', 'ap-northeast-1d'],
    };

    const handleRegionChange = (region: string) => {
        const defaultAZs = AZ_MAP[region]?.slice(0, 3) || [];
        updateDeploymentConfig({
            primaryRegion: region,
            availabilityZones: defaultAZs
        });
        setShowRegionPicker(false);
    };

    const handleAZToggle = (az: string) => {
        const currentAZs = deploymentConfig.availabilityZones;
        const newAZs = currentAZs.includes(az)
            ? currentAZs.filter(a => a !== az)
            : [...currentAZs, az].sort();

        updateDeploymentConfig({
            availabilityZones: newAZs
        });
    };

    const availableAZs = AZ_MAP[deploymentConfig.primaryRegion] || [];
    const selectedRegion = AWS_REGIONS.find(r => r.value === deploymentConfig.primaryRegion);

    return (
        <div className="h-16 bg-gray-850 border-t border-gray-800 px-6 flex items-center gap-6">
            {/* Region Selector */}
            <div className="relative">
                <label className="text-xs text-gray-400 block mb-1">Region</label>
                <button
                    onClick={() => setShowRegionPicker(!showRegionPicker)}
                    className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-200 rounded hover:bg-gray-750 transition-colors text-sm flex items-center gap-2"
                >
                    <span>🌍</span>
                    <span>{selectedRegion?.label || deploymentConfig.primaryRegion}</span>
                    <span className="text-gray-500">▼</span>
                </button>

                {showRegionPicker && (
                    <div className="absolute bottom-full mb-2 left-0 bg-gray-800 border border-gray-700 rounded shadow-lg w-64 max-h-64 overflow-y-auto z-50">
                        {AWS_REGIONS.map((region) => (
                            <button
                                key={region.value}
                                onClick={() => handleRegionChange(region.value)}
                                className={`w-full text-left px-3 py-2 hover:bg-gray-700 text-sm transition-colors ${region.value === deploymentConfig.primaryRegion
                                        ? 'bg-gray-700 text-gray-100'
                                        : 'text-gray-300'
                                    }`}
                            >
                                {region.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* AZ Checkboxes */}
            <div>
                <label className="text-xs text-gray-400 block mb-1">Availability Zones</label>
                <div className="flex gap-2">
                    {availableAZs.map((az) => {
                        const isSelected = deploymentConfig.availabilityZones.includes(az);
                        const azShort = az.split('-').pop();

                        return (
                            <button
                                key={az}
                                onClick={() => handleAZToggle(az)}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${isSelected
                                        ? 'bg-blue-600 text-white border-2 border-blue-500'
                                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                                    }`}
                                title={az}
                            >
                                {azShort}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* AZ Count Display */}
            <div className="ml-auto">
                <div className="text-xs text-gray-400 mb-1">Active AZs</div>
                <div className="text-sm font-medium text-gray-200">
                    {deploymentConfig.availabilityZones.length} selected
                </div>
            </div>

            {/* Info */}
            <div className="text-xs text-gray-500 max-w-xs">
                Resources with <span className="text-blue-400">per-AZ</span> deployment will create{' '}
                <span className="text-blue-400 font-medium">{deploymentConfig.availabilityZones.length}</span>{' '}
                instances
            </div>
        </div>
    );
};

export default DeploymentConfigBar;