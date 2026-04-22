import { CopyButton } from './CopyButton'
import './styles.css'

export const CodeSnippet = (props: {
    code: string
    html: string
}) => {
    return (
        <div>
            <CopyButton textToCopy={props.code} className="absolute top-2 right-2" />
            <div
                className="*:!bg-transparent leading-[1.3rem]"
                dangerouslySetInnerHTML={{
                    __html: props.html,
                }}
            />
        </div>
    )
}
