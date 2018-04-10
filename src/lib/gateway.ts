import uuidv1 from "uuid/v1";
import {EventEmitter} from "events";
import {FragmentBFF} from "./fragment";
import {FRAGMENT_RENDER_MODES} from "./enums";
import {IExposeConfig, IExposeFragment, IGatewayBFFConfiguration, IGatewayConfiguration} from "../types/gateway";

export class Gateway {
    public name: string;
    public url: string;

    constructor(gatewayConfig: IGatewayConfiguration) {
        this.name = gatewayConfig.name;
        this.url = gatewayConfig.url;
    }
}


export class GatewayStorefrontInstance extends Gateway {
    public events: EventEmitter = new EventEmitter();
    public config: IExposeConfig | undefined;

    constructor(gatewayConfig: IGatewayConfiguration) {
        super(gatewayConfig);
    }
}

export class GatewayBFF extends Gateway {
    public exposedConfig: IExposeConfig;
    private config: IGatewayBFFConfiguration;
    private fragments: { [name: string]: FragmentBFF } = {};

    constructor(gatewayConfig: IGatewayBFFConfiguration) {
        super(gatewayConfig);
        this.config = gatewayConfig;
        this.exposedConfig = {
            fragments: this.config.fragments.reduce((fragmentList: { [name: string]: IExposeFragment }, fragment) => {
                fragmentList[fragment.name] = {
                    version: fragment.version,
                    render: fragment.render,
                    assets: fragment.versions[fragment.version].assets,
                    dependencies: fragment.versions[fragment.version].dependencies,
                };

                this.fragments[fragment.name] = new FragmentBFF(fragment);

                return fragmentList;
            }, {}),
            hash: uuidv1(),
        };
    }

    public async renderFragment(fragmentName: string, renderMode: FRAGMENT_RENDER_MODES = FRAGMENT_RENDER_MODES.PREVIEW, cookieValue?: string) {
        if (this.fragments[fragmentName]) {
            const fragmentContent = await this.fragments[fragmentName].render({}, cookieValue);
            switch (renderMode) {
                case FRAGMENT_RENDER_MODES.STREAM:
                    return fragmentContent;
                case FRAGMENT_RENDER_MODES.PREVIEW:
                    return this.wrapFragmentContent(fragmentContent, fragmentName);
            }
        } else {
            throw new Error(`Failed to find fragment: ${fragmentName}`);
        }
    }

    private wrapFragmentContent(htmlContent: string, fragmentName: string) {
        return `<html><head><title>${this.config.name} - ${fragmentName}</title>${this.config.isMobile && '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />'}</head><body>${htmlContent}</body></html>`
    }
}